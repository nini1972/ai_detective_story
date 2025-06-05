#!/usr/bin/env python3
"""
Dual-AI Detective Game Backend

This FastAPI server implements the world's first dual-AI detective game with:
- OpenAI GPT-4 for creative storytelling and character generation
- Anthropic Claude for logical analysis and deduction assistance  
- FAL.AI for visual scene generation from testimony
- Dynamic character discovery through conversation analysis
- Real-time visual testimony generation

Author: AI-Generated (Claude-3.5-Sonnet) with human guidance
License: Proprietary
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
from dotenv import load_dotenv
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import uuid
from datetime import datetime, timedelta
from emergentintegrations.llm.chat import LlmChat, UserMessage
import fal_client
import json
import time
import logging
from typing import Dict, Any
from collections import defaultdict

# Load environment variables
load_dotenv()

# Configure logging for token usage monitoring
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Dual-AI Detective Game API",
    description="Revolutionary detective game with dual-AI intelligence and visual testimony generation",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB setup
mongo_url = os.environ.get("MONGO_URL")
db_name = os.environ.get("DB_NAME")
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# AI API Keys
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
FAL_KEY = os.environ.get("FAL_KEY")

# Set FAL API key for image generation
if FAL_KEY:
    os.environ["FAL_KEY"] = FAL_KEY

# Data models
class Character(BaseModel):
    id: str
    name: str
    description: str
    background: str
    alibi: str
    motive: Optional[str] = None
    is_culprit: bool = False

class Evidence(BaseModel):
    id: str
    name: str
    description: str
    location_found: str
    significance: str
    is_key_evidence: bool = False

class VisualScene(BaseModel):
    id: str
    title: str
    description: str
    image_url: str
    generated_from: str  # "crime_scene", "testimony", "evidence_analysis"
    context: str  # What triggered this scene generation
    character_involved: Optional[str] = None
    timestamp: datetime

class DetectiveCase(BaseModel):
    id: str
    title: str
    setting: str
    crime_scene_description: str
    crime_scene_image_url: Optional[str] = None
    victim_name: str
    characters: List[Character]
    evidence: List[Evidence]
    visual_scenes: List[VisualScene] = []
    solution: str
    created_at: datetime
    difficulty: str = "medium"

class QuestionRequest(BaseModel):
    case_id: str
    character_id: str
    question: str

class AnalysisRequest(BaseModel):
    case_id: str
    evidence_ids: List[str]
    theory: str

class TokenUsageRecord(BaseModel):
    id: str
    session_id: str
    case_id: Optional[str] = None
    timestamp: datetime
    service: str  # "openai", "anthropic", "fal_ai"
    operation: str  # "case_generation", "character_question", "evidence_analysis", "visual_generation"
    input_tokens: Optional[int] = 0
    output_tokens: Optional[int] = 0
    total_tokens: Optional[int] = 0
    estimated_cost: float  # in USD
    model_used: Optional[str] = None
    prompt_length: int
    response_length: int
    success: bool = True
    error_message: Optional[str] = None

class UsageStatistics(BaseModel):
    total_cost: float
    total_tokens: int
    service_breakdown: Dict[str, Dict[str, Any]]
    operation_breakdown: Dict[str, Dict[str, Any]]
    session_count: int
    case_count: int
    average_cost_per_case: float
    last_updated: datetime

class PromptTestCase(BaseModel):
    id: str
    name: str
    prompt_type: str  # "case_generation", "character_question", "evidence_analysis", "character_detection"
    service: str  # "openai", "anthropic"
    test_input: Dict[str, Any]
    expected_format: Dict[str, Any]
    validation_rules: List[str]
    description: str

class PromptTestResult(BaseModel):
    id: str
    test_case_id: str
    test_case_name: str
    timestamp: datetime
    success: bool
    execution_time: float  # in seconds
    response_received: bool
    json_parse_success: bool
    validation_passed: bool
    token_count: int
    estimated_cost: float
    error_message: Optional[str] = None
    response_preview: Optional[str] = None  # First 200 chars of response
    detailed_results: Dict[str, Any]

class PromptTestSuite(BaseModel):
    id: str
    name: str
    timestamp: datetime
    tests_run: int
    tests_passed: int
    tests_failed: int
    total_execution_time: float
    total_cost: float
    success_rate: float
    results: List[PromptTestResult]

# Token Usage Tracking Service
class TokenUsageTracker:
    """
    Comprehensive token usage and cost tracking for all AI services.
    Addresses Copilot recommendations for monitoring, logging, and cost control.
    """
    
    # Cost estimates per 1K tokens (updated June 2025 pricing)
    COST_PER_1K_TOKENS = {
        "openai": {
            "gpt-4.1": {"input": 0.01, "output": 0.03},
            "gpt-4": {"input": 0.01, "output": 0.03},
            "gpt-3.5-turbo": {"input": 0.001, "output": 0.002}
        },
        "anthropic": {
            "claude-sonnet-4-20250514": {"input": 0.015, "output": 0.075},
            "claude-3.5-sonnet": {"input": 0.003, "output": 0.015},
            "claude-3-haiku": {"input": 0.00025, "output": 0.00125}
        },
        "fal_ai": {
            "flux/dev": {"per_image": 0.055},  # FAL.AI image generation cost
            "flux/schnell": {"per_image": 0.03}
        }
    }
    
    def __init__(self, db):
        self.db = db
        self.session_usage = defaultdict(lambda: defaultdict(float))  # Real-time session tracking
        
    async def estimate_tokens(self, text: str, service: str) -> int:
        """Estimate token count for text (rough approximation)"""
        if service in ["openai", "anthropic"]:
            # Rough approximation: 1 token ≈ 4 characters for English
            return max(1, len(text) // 4)
        return 0
    
    async def log_usage(self, 
                       session_id: str,
                       case_id: Optional[str],
                       service: str,
                       operation: str,
                       prompt: str,
                       response: str,
                       model_used: str = None,
                       success: bool = True,
                       error_message: str = None) -> TokenUsageRecord:
        """
        Log AI service usage with comprehensive tracking.
        Implements Copilot's logging and monitoring recommendations.
        """
        try:
            # Estimate tokens
            input_tokens = await self.estimate_tokens(prompt, service) if prompt else 0
            output_tokens = await self.estimate_tokens(response, service) if response else 0
            total_tokens = input_tokens + output_tokens
            
            # Calculate cost
            estimated_cost = self._calculate_cost(service, model_used, input_tokens, output_tokens)
            
            # Create usage record
            usage_record = TokenUsageRecord(
                id=str(uuid.uuid4()),
                session_id=session_id,
                case_id=case_id,
                timestamp=datetime.now(),
                service=service,
                operation=operation,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                total_tokens=total_tokens,
                estimated_cost=estimated_cost,
                model_used=model_used,
                prompt_length=len(prompt) if prompt else 0,
                response_length=len(response) if response else 0,
                success=success,
                error_message=error_message
            )
            
            # Store in database
            await self.db.token_usage.insert_one(usage_record.model_dump())
            
            # Update session tracking
            self.session_usage[session_id]["total_cost"] += estimated_cost
            self.session_usage[session_id]["total_tokens"] += total_tokens
            
            # Log for monitoring
            logger.info(f"Token usage logged: {service} | {operation} | {total_tokens} tokens | ${estimated_cost:.4f} | Session: {session_id}")
            
            return usage_record
            
        except Exception as e:
            logger.error(f"Failed to log token usage: {str(e)}")
            # Return a basic record even if logging fails
            return TokenUsageRecord(
                id=str(uuid.uuid4()),
                session_id=session_id,
                case_id=case_id,
                timestamp=datetime.now(),
                service=service,
                operation=operation,
                estimated_cost=0.0,
                prompt_length=len(prompt) if prompt else 0,
                response_length=len(response) if response else 0,
                success=False,
                error_message=str(e)
            )
    
    def _calculate_cost(self, service: str, model: str, input_tokens: int, output_tokens: int) -> float:
        """Calculate estimated cost based on service and model"""
        try:
            if service == "fal_ai":
                # FAL.AI charges per image, not tokens
                return self.COST_PER_1K_TOKENS["fal_ai"].get(model, {"per_image": 0.055})["per_image"]
            
            service_costs = self.COST_PER_1K_TOKENS.get(service, {})
            model_costs = service_costs.get(model, service_costs.get("gpt-4", {"input": 0.01, "output": 0.03}))
            
            input_cost = (input_tokens / 1000) * model_costs.get("input", 0.01)
            output_cost = (output_tokens / 1000) * model_costs.get("output", 0.03)
            
            return input_cost + output_cost
            
        except Exception:
            # Fallback cost estimation
            return (input_tokens + output_tokens) / 1000 * 0.02
    
    async def get_session_usage(self, session_id: str) -> Dict[str, Any]:
        """Get real-time usage for a session"""
        db_usage = await self.db.token_usage.find({"session_id": session_id}).to_list(None)
        
        total_cost = sum(record.get("estimated_cost", 0) for record in db_usage)
        total_tokens = sum(record.get("total_tokens", 0) for record in db_usage)
        
        service_breakdown = defaultdict(lambda: {"cost": 0, "tokens": 0, "count": 0})
        
        for record in db_usage:
            service = record.get("service", "unknown")
            service_breakdown[service]["cost"] += record.get("estimated_cost", 0)
            service_breakdown[service]["tokens"] += record.get("total_tokens", 0)
            service_breakdown[service]["count"] += 1
        
        return {
            "session_id": session_id,
            "total_cost": total_cost,
            "total_tokens": total_tokens,
            "service_breakdown": dict(service_breakdown),
            "operation_count": len(db_usage)
        }
    
    async def get_usage_statistics(self, days: int = 30) -> UsageStatistics:
        """Get comprehensive usage statistics"""
        cutoff_date = datetime.now() - timedelta(days=days)
        
        # Get recent usage records
        usage_records = await self.db.token_usage.find({
            "timestamp": {"$gte": cutoff_date}
        }).to_list(None)
        
        total_cost = sum(record.get("estimated_cost", 0) for record in usage_records)
        total_tokens = sum(record.get("total_tokens", 0) for record in usage_records)
        
        # Service breakdown
        service_breakdown = defaultdict(lambda: {"cost": 0, "tokens": 0, "operations": 0})
        operation_breakdown = defaultdict(lambda: {"cost": 0, "tokens": 0, "count": 0})
        
        unique_sessions = set()
        unique_cases = set()
        
        for record in usage_records:
            service = record.get("service", "unknown")
            operation = record.get("operation", "unknown")
            cost = record.get("estimated_cost", 0)
            tokens = record.get("total_tokens", 0)
            
            service_breakdown[service]["cost"] += cost
            service_breakdown[service]["tokens"] += tokens
            service_breakdown[service]["operations"] += 1
            
            operation_breakdown[operation]["cost"] += cost
            operation_breakdown[operation]["tokens"] += tokens
            operation_breakdown[operation]["count"] += 1
            
            if record.get("session_id"):
                unique_sessions.add(record.get("session_id"))
            if record.get("case_id"):
                unique_cases.add(record.get("case_id"))
        
        session_count = len(unique_sessions)
        case_count = len(unique_cases)
        average_cost_per_case = total_cost / case_count if case_count > 0 else 0
        
        return UsageStatistics(
            total_cost=total_cost,
            total_tokens=total_tokens,
            service_breakdown=dict(service_breakdown),
            operation_breakdown=dict(operation_breakdown),
            session_count=session_count,
            case_count=case_count,
            average_cost_per_case=average_cost_per_case,
            last_updated=datetime.now()
        )
    
    async def check_rate_limits(self, session_id: str) -> Dict[str, Any]:
        """
        Check if session is within rate limits.
        Implements Copilot's rate limiting recommendation.
        """
        session_usage = await self.get_session_usage(session_id)
        
        # Define limits (configurable)
        MAX_COST_PER_SESSION = 5.0  # $5 limit per session
        MAX_OPERATIONS_PER_HOUR = 100  # 100 operations per hour
        
        # Check cost limit
        cost_exceeded = session_usage["total_cost"] > MAX_COST_PER_SESSION
        
        # Check operations limit (last hour)
        one_hour_ago = datetime.now() - timedelta(hours=1)
        recent_operations = await self.db.token_usage.count_documents({
            "session_id": session_id,
            "timestamp": {"$gte": one_hour_ago}
        })
        
        operations_exceeded = recent_operations > MAX_OPERATIONS_PER_HOUR
        
        return {
            "within_limits": not (cost_exceeded or operations_exceeded),
            "cost_limit_exceeded": cost_exceeded,
            "operations_limit_exceeded": operations_exceeded,
            "current_cost": session_usage["total_cost"],
            "max_cost": MAX_COST_PER_SESSION,
            "recent_operations": recent_operations,
            "max_operations": MAX_OPERATIONS_PER_HOUR
        }

# Initialize token usage tracker after database setup
token_tracker = TokenUsageTracker(db)

# Automated Prompt Testing Framework
class PromptTestFramework:
    """
    Comprehensive prompt testing framework for AI services.
    Implements Copilot's recommendations for automated testing, JSON validation, and API change protection.
    """
    
    def __init__(self, db, token_tracker):
        self.db = db
        self.token_tracker = token_tracker
        self.test_cases = self._initialize_test_cases()
    
    def _initialize_test_cases(self) -> List[PromptTestCase]:
        """Initialize predefined test cases for all prompt types"""
        return [
            # Case Generation Test
            PromptTestCase(
                id="test_case_generation_01",
                name="Basic Case Generation",
                prompt_type="case_generation",
                service="openai",
                test_input={},
                expected_format={
                    "title": "string",
                    "setting": "string", 
                    "crime_scene_description": "string",
                    "victim_name": "string",
                    "characters": "array",
                    "evidence": "array",
                    "solution": "string"
                },
                validation_rules=[
                    "response_is_json",
                    "has_required_fields",
                    "characters_array_not_empty",
                    "evidence_array_not_empty",
                    "title_not_empty"
                ],
                description="Tests basic case generation with JSON structure validation"
            ),
            
            # Character Question Test
            PromptTestCase(
                id="test_character_question_01",
                name="Character Response Test",
                prompt_type="character_question",
                service="openai",
                test_input={
                    "character_name": "Lady Margaret Blackwood",
                    "question": "Where were you during the murder?",
                    "character_context": {
                        "name": "Lady Margaret Blackwood",
                        "description": "The victim's wife, elegant but cold",
                        "background": "Married Lord Blackwood for his fortune 10 years ago",
                        "alibi": "Claims she was reading in her bedroom",
                        "motive": "Stands to inherit everything"
                    }
                },
                expected_format={
                    "response": "string"
                },
                validation_rules=[
                    "response_not_empty",
                    "response_under_200_words",
                    "stays_in_character"
                ],
                description="Tests character questioning with realistic responses"
            ),
            
            # Character Detection Test
            PromptTestCase(
                id="test_character_detection_01",
                name="New Character Detection",
                prompt_type="character_detection",
                service="anthropic",
                test_input={
                    "conversation": "Detective: Who else was around that evening?\nLady Margaret: Well, the gardener was acting strange, and I saw the cook leaving early.",
                    "existing_characters": ["Lady Margaret Blackwood", "Dr. Harrison"]
                },
                expected_format={
                    "new_characters": "array"
                },
                validation_rules=[
                    "response_is_json",
                    "is_array_format",
                    "detects_gardener_and_cook"
                ],
                description="Tests detection of new characters mentioned in conversation"
            ),
            
            # Evidence Analysis Test
            PromptTestCase(
                id="test_evidence_analysis_01",
                name="Evidence Analysis Test",
                prompt_type="evidence_analysis",
                service="anthropic",
                test_input={
                    "theory": "Lady Margaret poisoned her husband with cyanide to inherit his fortune.",
                    "evidence": ["Poisoned brandy glass", "Lady Margaret's financial records"],
                    "case_context": {
                        "victim": "Lord Blackwood",
                        "setting": "Victorian mansion"
                    }
                },
                expected_format={
                    "analysis": "string"
                },
                validation_rules=[
                    "response_not_empty",
                    "mentions_evidence",
                    "provides_logical_analysis",
                    "discusses_strengths_and_weaknesses"
                ],
                description="Tests evidence analysis with logical reasoning"
            )
        ]
    
    async def validate_response(self, test_case: PromptTestCase, response: str) -> Dict[str, Any]:
        """Validate response against test case rules"""
        validation_results = {
            "response_is_json": False,
            "has_required_fields": False,
            "response_not_empty": False,
            "response_under_200_words": False,
            "stays_in_character": False,
            "is_array_format": False,
            "characters_array_not_empty": False,
            "evidence_array_not_empty": False,
            "title_not_empty": False,
            "detects_gardener_and_cook": False,
            "mentions_evidence": False,
            "provides_logical_analysis": False,
            "discusses_strengths_and_weaknesses": False
        }
        
        # Basic response checks
        validation_results["response_not_empty"] = bool(response and response.strip())
        validation_results["response_under_200_words"] = len(response.split()) <= 200
        
        # JSON validation
        try:
            parsed_response = json.loads(response)
            validation_results["response_is_json"] = True
            
            # Check required fields for case generation
            if test_case.prompt_type == "case_generation":
                expected_fields = test_case.expected_format.keys()
                validation_results["has_required_fields"] = all(
                    field in parsed_response for field in expected_fields
                )
                
                if "characters" in parsed_response:
                    validation_results["characters_array_not_empty"] = (
                        isinstance(parsed_response["characters"], list) and 
                        len(parsed_response["characters"]) > 0
                    )
                
                if "evidence" in parsed_response:
                    validation_results["evidence_array_not_empty"] = (
                        isinstance(parsed_response["evidence"], list) and 
                        len(parsed_response["evidence"]) > 0
                    )
                
                if "title" in parsed_response:
                    validation_results["title_not_empty"] = bool(parsed_response["title"].strip())
            
            # Check array format for character detection
            if test_case.prompt_type == "character_detection":
                validation_results["is_array_format"] = isinstance(parsed_response, list)
                
                # Check if gardener and cook are detected
                if isinstance(parsed_response, list):
                    mentioned_roles = [item.get("role", "").lower() for item in parsed_response if isinstance(item, dict)]
                    validation_results["detects_gardener_and_cook"] = (
                        any("gardener" in role for role in mentioned_roles) and
                        any("cook" in role for role in mentioned_roles)
                    )
                    
        except json.JSONDecodeError:
            validation_results["response_is_json"] = False
        
        # Content-based validation
        response_lower = response.lower()
        
        # Character response validation
        if test_case.prompt_type == "character_question":
            validation_results["stays_in_character"] = (
                "margaret" in response_lower or "i" in response_lower
            )
        
        # Evidence analysis validation  
        if test_case.prompt_type == "evidence_analysis":
            validation_results["mentions_evidence"] = (
                "evidence" in response_lower or "brandy" in response_lower
            )
            validation_results["provides_logical_analysis"] = (
                "analysis" in response_lower or "logical" in response_lower or "reasoning" in response_lower
            )
            validation_results["discusses_strengths_and_weaknesses"] = (
                ("strength" in response_lower or "support" in response_lower) and
                ("weakness" in response_lower or "gap" in response_lower or "missing" in response_lower)
            )
        
        return validation_results
    
    async def run_single_test(self, test_case: PromptTestCase, session_id: str) -> PromptTestResult:
        """Run a single prompt test case"""
        start_time = time.time()
        test_result = PromptTestResult(
            id=str(uuid.uuid4()),
            test_case_id=test_case.id,
            test_case_name=test_case.name,
            timestamp=datetime.now(),
            success=False,
            execution_time=0.0,
            response_received=False,
            json_parse_success=False,
            validation_passed=False,
            token_count=0,
            estimated_cost=0.0,
            detailed_results={}
        )
        
        try:
            # Initialize AI service
            ai_service = DualAIDetectiveService()
            
            if test_case.service == "openai":
                await ai_service.initialize_storyteller(session_id)
                ai_client = ai_service.storyteller_ai
            else:  # anthropic
                await ai_service.initialize_logic_ai(session_id)
                ai_client = ai_service.logic_ai
            
            # Build prompt based on test type
            prompt = self._build_test_prompt(test_case)
            
            # Execute prompt
            response = await ai_client.send_message(UserMessage(text=prompt))
            test_result.response_received = True
            test_result.response_preview = response[:200] if response else None
            
            # Log token usage
            usage_record = await self.token_tracker.log_usage(
                session_id=session_id,
                case_id=None,
                service=test_case.service,
                operation=f"prompt_test_{test_case.prompt_type}",
                prompt=prompt,
                response=response,
                model_used="gpt-4.1" if test_case.service == "openai" else "claude-sonnet-4-20250514",
                success=True
            )
            
            test_result.token_count = usage_record.total_tokens
            test_result.estimated_cost = usage_record.estimated_cost
            
            # Validate response
            validation_results = await self.validate_response(test_case, response)
            test_result.detailed_results = validation_results
            
            # Check JSON parsing
            try:
                json.loads(response) if test_case.prompt_type in ["case_generation", "character_detection"] else response
                test_result.json_parse_success = True
            except json.JSONDecodeError:
                test_result.json_parse_success = (test_case.prompt_type not in ["case_generation", "character_detection"])
            
            # Check if validation passed
            required_validations = test_case.validation_rules
            passed_validations = [rule for rule in required_validations if validation_results.get(rule, False)]
            test_result.validation_passed = len(passed_validations) >= len(required_validations) * 0.8  # 80% pass rate
            
            # Overall success
            test_result.success = (
                test_result.response_received and 
                test_result.json_parse_success and 
                test_result.validation_passed
            )
            
        except Exception as e:
            test_result.error_message = str(e)
            logger.error(f"Prompt test failed: {test_case.name} - {str(e)}")
        
        test_result.execution_time = time.time() - start_time
        return test_result
    
    def _build_test_prompt(self, test_case: PromptTestCase) -> str:
        """Build test prompt based on test case type"""
        if test_case.prompt_type == "case_generation":
            return """Generate a complete detective mystery case with the following structure:

Create a JSON response with:
1. Case title and setting (location, time period)
2. Victim name and basic crime scene description
3. 4-5 characters with detailed backgrounds, motives, and alibis
4. 6-8 pieces of evidence with descriptions and significance
5. The complete solution explaining who did it and how

Return ONLY valid JSON with this exact structure:
{
  "title": "...",
  "setting": "...",
  "crime_scene_description": "...",
  "victim_name": "...",
  "characters": [{"name": "...", "description": "...", "background": "...", "alibi": "...", "motive": "...", "is_culprit": false}],
  "evidence": [{"name": "...", "description": "...", "location_found": "...", "significance": "...", "is_key_evidence": false}],
  "solution": "..."
}"""
            
        elif test_case.prompt_type == "character_question":
            context = test_case.test_input["character_context"]
            return f"""You are roleplaying as {context['name']} in a detective mystery.

CHARACTER CONTEXT:
- Name: {context['name']}
- Description: {context['description']}
- Background: {context['background']}
- Your alibi: {context['alibi']}
- Possible motive: {context['motive']}

The detective is asking you: "{test_case.test_input['question']}"

Respond in character with personality consistent with your background. Keep response under 150 words."""
            
        elif test_case.prompt_type == "character_detection":
            return f"""Analyze the following conversation for mentions of NEW people:

CONVERSATION:
{test_case.test_input['conversation']}

EXISTING CHARACTERS: {', '.join(test_case.test_input['existing_characters'])}

Return a JSON array of new characters found:
[{{"role": "role/title", "context": "what was said about them"}}]

If no new people are mentioned, return an empty array: []"""
            
        elif test_case.prompt_type == "evidence_analysis":
            return f"""Analyze the following detective theory and evidence:

CASE CONTEXT:
- Victim: {test_case.test_input['case_context']['victim']}
- Setting: {test_case.test_input['case_context']['setting']}

DETECTIVE'S THEORY:
{test_case.test_input['theory']}

EVIDENCE BEING CONSIDERED:
{', '.join(test_case.test_input['evidence'])}

Provide a logical analysis including strengths, weaknesses, evidence relationships, and additional investigation needed."""
        
        return "Invalid test case type"
    
    async def run_test_suite(self, session_id: str, test_types: Optional[List[str]] = None) -> PromptTestSuite:
        """Run a complete test suite"""
        suite_start_time = time.time()
        
        # Filter test cases if specific types requested
        if test_types:
            test_cases_to_run = [tc for tc in self.test_cases if tc.prompt_type in test_types]
        else:
            test_cases_to_run = self.test_cases
        
        # Run all tests
        results = []
        total_cost = 0.0
        
        for test_case in test_cases_to_run:
            result = await self.run_single_test(test_case, session_id)
            results.append(result)
            total_cost += result.estimated_cost
        
        # Calculate suite statistics
        tests_passed = sum(1 for r in results if r.success)
        tests_failed = len(results) - tests_passed
        success_rate = (tests_passed / len(results)) * 100 if results else 0
        
        suite = PromptTestSuite(
            id=str(uuid.uuid4()),
            name=f"Prompt Test Suite - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            timestamp=datetime.now(),
            tests_run=len(results),
            tests_passed=tests_passed,
            tests_failed=tests_failed,
            total_execution_time=time.time() - suite_start_time,
            total_cost=total_cost,
            success_rate=success_rate,
            results=results
        )
        
        # Store suite results in database
        await self.db.prompt_test_suites.insert_one(suite.model_dump())
        
        return suite

# Initialize prompt test framework
prompt_tester = PromptTestFramework(db, token_tracker)

# AI Service Class
class DualAIDetectiveService:
    def __init__(self):
        self.storyteller_ai = None  # OpenAI - for creative content
        self.logic_ai = None        # Claude - for logical analysis
    
    async def initialize_storyteller(self, session_id: str):
        """Initialize OpenAI for creative storytelling"""
        self.storyteller_ai = LlmChat(
            api_key=OPENAI_API_KEY,
            session_id=f"storyteller_{session_id}",
            system_message="""You are the Storyteller AI in a revolutionary dual-AI detective game. Your role is to create rich, immersive mystery narratives with compelling characters and atmospheric descriptions.

Your responsibilities:
- Generate detailed character personalities, backgrounds, and dialogue
- Create atmospheric crime scene descriptions
- Develop realistic motives and alibis
- Craft engaging narrative elements
- Respond in character when suspects are questioned

Always maintain narrative consistency and create content that feels like a premium detective novel."""
        ).with_model("openai", "gpt-4.1")
    
    async def initialize_logic_ai(self, session_id: str):
        """Initialize Claude for logical analysis"""
        self.logic_ai = LlmChat(
            api_key=ANTHROPIC_API_KEY,
            session_id=f"logic_{session_id}",
            system_message="""You are the Logic AI in a revolutionary dual-AI detective game. Your role is to provide logical analysis, maintain case consistency, and help players with deductive reasoning.

Your responsibilities:
- Analyze evidence relationships and logical connections
- Detect contradictions in testimonies or theories
- Provide structured case summaries and timelines
- Offer logical deduction guidance
- Maintain factual consistency throughout the investigation

Always think step-by-step and provide clear, logical reasoning for your conclusions."""
        ).with_model("anthropic", "claude-sonnet-4-20250514")

    async def generate_mystery_case(self, session_id: str) -> DetectiveCase:
        """Generate a complete mystery case using the Storyteller AI"""
        await self.initialize_storyteller(session_id)
        
        prompt = """Generate a complete detective mystery case with the following structure:

Create a JSON response with:
1. Case title and setting (location, time period)
2. Victim name and basic crime scene description
3. 4-5 characters with detailed backgrounds, motives, and alibis
4. 6-8 pieces of evidence with descriptions and significance
5. The complete solution explaining who did it and how

Make it challenging but solvable. Include red herrings and multiple suspects with believable motives. Set it in an interesting location like a mansion, cruise ship, or exclusive resort.

Return ONLY valid JSON with this exact structure:
{
  "title": "...",
  "setting": "...",
  "crime_scene_description": "...",
  "victim_name": "...",
  "characters": [
    {
      "name": "...",
      "description": "...",
      "background": "...",
      "alibi": "...",
      "motive": "...",
      "is_culprit": false
    }
  ],
  "evidence": [
    {
      "name": "...",
      "description": "...",
      "location_found": "...",
      "significance": "...",
      "is_key_evidence": false
    }
  ],
  "solution": "..."
}"""

        response = await self.storyteller_ai.send_message(UserMessage(text=prompt))
        
        # Log token usage for case generation
        await token_tracker.log_usage(
            session_id=session_id,
            case_id=None,  # Case ID not yet available
            service="openai",
            operation="case_generation",
            prompt=prompt,
            response=response,
            model_used="gpt-4.1",
            success=True
        )
        
        # Parse the response and create case
        import json
        try:
            case_data = json.loads(response)
            
            # Add IDs and process data
            case_id = str(uuid.uuid4())
            characters = []
            for char in case_data.get("characters", []):
                characters.append(Character(
                    id=str(uuid.uuid4()),
                    name=char["name"],
                    description=char["description"],
                    background=char["background"],
                    alibi=char["alibi"],
                    motive=char.get("motive"),
                    is_culprit=char.get("is_culprit", False)
                ))
            
            evidence = []
            for ev in case_data.get("evidence", []):
                evidence.append(Evidence(
                    id=str(uuid.uuid4()),
                    name=ev["name"],
                    description=ev["description"],
                    location_found=ev["location_found"],
                    significance=ev["significance"],
                    is_key_evidence=ev.get("is_key_evidence", False)
                ))
            
            case = DetectiveCase(
                id=case_id,
                title=case_data["title"],
                setting=case_data["setting"],
                crime_scene_description=case_data["crime_scene_description"],
                crime_scene_image_url=None,  # Will be generated after case creation
                victim_name=case_data["victim_name"],
                characters=characters,
                evidence=evidence,
                visual_scenes=[],
                solution=case_data["solution"],
                created_at=datetime.now()
            )
            
            # Store case in database first
            await db.cases.insert_one(case.model_dump())
            
            # Schedule crime scene image generation in background (non-blocking)
            asyncio.create_task(self._generate_crime_scene_background(case_id))
            
            return case
            
        except json.JSONDecodeError as e:
            # Log token usage for failed case generation
            await token_tracker.log_usage(
                session_id=session_id,
                case_id=None,
                service="openai",
                operation="case_generation",
                prompt=prompt,
                response=response,
                model_used="gpt-4.1",
                success=False,
                error_message=f"JSON parsing failed: {str(e)}"
            )
            # Fallback case if JSON parsing fails
            return self._create_fallback_case()
    
    def _create_fallback_case(self) -> DetectiveCase:
        """Create a fallback mystery case"""
        case_id = str(uuid.uuid4())
        return DetectiveCase(
            id=case_id,
            title="Murder at Blackwood Manor",
            setting="A Victorian mansion during a thunderstorm in 1920s England",
            crime_scene_description="Lord Blackwood found dead in his locked study, a glass of brandy spilled beside him",
            victim_name="Lord Blackwood",
            characters=[
                Character(
                    id=str(uuid.uuid4()),
                    name="Lady Margaret Blackwood",
                    description="The victim's wife, elegant but cold",
                    background="Married Lord Blackwood for his fortune 10 years ago",
                    alibi="Claims she was reading in her bedroom",
                    motive="Stands to inherit everything",
                    is_culprit=False
                ),
                Character(
                    id=str(uuid.uuid4()),
                    name="Dr. Harrison",
                    description="The family physician and old friend",
                    background="Has been treating the family for 20 years",
                    alibi="Was examining medical equipment in his room",
                    motive="Lord Blackwood discovered Dr. Harrison's gambling debts",
                    is_culprit=True
                )
            ],
            evidence=[
                Evidence(
                    id=str(uuid.uuid4()),
                    name="Poisoned Brandy Glass",
                    description="A crystal glass with traces of cyanide",
                    location_found="Lord Blackwood's study desk",
                    significance="The murder weapon",
                    is_key_evidence=True
                ),
                Evidence(
                    id=str(uuid.uuid4()),
                    name="Medical Bag",
                    description="Dr. Harrison's bag with missing cyanide vial",
                    location_found="Dr. Harrison's guest room",
                    significance="Contains the poison used in the murder",
                    is_key_evidence=True
                )
            ],
            solution="Dr. Harrison poisoned Lord Blackwood's brandy with cyanide to prevent exposure of his gambling debts",
            created_at=datetime.now()
        )

    async def question_character(self, case_id: str, character_name: str, question: str, session_id: str) -> dict:
        """Have a character respond to questioning using Storyteller AI and detect new character mentions"""
        await self.initialize_storyteller(session_id)
        await self.initialize_logic_ai(session_id)
        
        # Get case details from database
        case = await db.cases.find_one({"id": case_id})
        if not case:
            return {"error": "Case information not available."}
        
        # Find the character details
        character = None
        for char in case["characters"]:
            if char["name"] == character_name:
                character = char
                break
        
        if not character:
            return {"error": "Character not found."}
        
        # Get all existing character names for context
        existing_names = [char["name"] for char in case["characters"]]
        
        prompt = f"""You are roleplaying as {character_name} in the detective mystery "{case['title']}".

CHARACTER CONTEXT:
- Name: {character['name']}
- Description: {character['description']}
- Background: {character['background']}
- Your alibi: {character['alibi']}
- Possible motive: {character.get('motive', 'No clear motive')}
- Are you the culprit: {'Yes' if character.get('is_culprit', False) else 'No'}

CASE CONTEXT:
- Victim: {case['victim_name']}
- Setting: {case['setting']}
- Crime scene: {case['crime_scene_description']}
- Other people involved: {', '.join(existing_names)}

The detective is asking you: "{question}"

IMPORTANT: You may naturally mention other people who could be relevant to the investigation - staff members, visitors, family, neighbors, etc. Be realistic about who might have been around or involved.

Respond in character with:
- Personality consistent with your background and description
- Show appropriate emotions (nervousness if guilty, concern if innocent)
- Provide helpful information but with realistic evasions if you're hiding something
- Stay true to your alibi and background
- If you're the culprit, be subtle - don't confess easily but show slight nervousness
- If innocent, be helpful but may have your own concerns or secrets
- Naturally mention other people if relevant (e.g., "The gardener was acting strange that day" or "I saw the cook leaving early")

Keep responses conversational, realistic, and under 150 words. Make it feel like a real interrogation."""

        response = await self.storyteller_ai.send_message(UserMessage(text=prompt))
        
        # Log token usage for character questioning (OpenAI)
        await token_tracker.log_usage(
            session_id=session_id,
            case_id=case_id,
            service="openai",
            operation="character_question",
            prompt=prompt,
            response=response,
            model_used="gpt-4.1",
            success=True
        )
        
        # Now detect if any new characters were mentioned
        detection_prompt = f"""Analyze the following conversation for mentions of NEW people who could potentially be questioned in this detective investigation.

CONVERSATION:
Detective: "{question}"
{character_name}: "{response}"

EXISTING CHARACTERS (do not include these): {', '.join(existing_names)}

Look for mentions of:
- Staff members (gardener, cook, maid, butler, driver, etc.)
- Visitors or guests
- Neighbors or locals
- Family members not yet listed
- Service people (delivery person, mailman, doctor, etc.)
- Anyone else who might have been present or relevant

For each NEW person mentioned, extract:
1. Their role/title (e.g., "gardener", "cook", "delivery person")
2. Any descriptive context from the conversation

Return a JSON array of new characters found:
[
  {{
    "role": "role/title",
    "context": "what was said about them"
  }}
]

If no new people are mentioned, return an empty array: []

Return ONLY the JSON array, nothing else."""

        mentions_response = await self.logic_ai.send_message(UserMessage(text=detection_prompt))
        
        # Log token usage for character detection (Claude)
        await token_tracker.log_usage(
            session_id=session_id,
            case_id=case_id,
            service="anthropic",
            operation="character_detection",
            prompt=detection_prompt,
            response=mentions_response,
            model_used="claude-sonnet-4-20250514",
            success=True
        )
        
        # Parse the mentions
        try:
            import json
            new_mentions = json.loads(mentions_response.strip())
        except:
            new_mentions = []
        
        return {
            "response": response,
            "new_character_mentions": new_mentions,
            "visual_scene": None  # Will be populated if scene is generated
        }

    async def generate_visual_scene(self, case_id: str, scene_context: str, scene_type: str = "testimony", character_name: str = None) -> Optional[VisualScene]:
        """Generate a visual scene based on testimony or case context"""
        try:
            # Get case details for context
            case = await db.cases.find_one({"id": case_id})
            if not case:
                return None
            
            await self.initialize_storyteller(str(uuid.uuid4()))
            
            # Create detailed prompt for image generation
            prompt_creation = f"""Based on this detective case context, create a detailed visual prompt for image generation:

CASE CONTEXT:
- Title: {case['title']}
- Setting: {case['setting']}
- Crime Scene: {case['crime_scene_description']}
- Victim: {case['victim_name']}

SCENE TO VISUALIZE:
{scene_context}

Create a detailed image generation prompt that includes:
1. Visual style: detective noir, atmospheric, cinematic
2. Time period/setting details from the case
3. Specific scene elements mentioned
4. Lighting and mood appropriate for a detective mystery
5. Character descriptions if people are involved

Return ONLY the image prompt, nothing else. Make it detailed but under 200 words.
Keep it appropriate for a detective game - dramatic but not graphic."""

            image_prompt = await self.storyteller_ai.send_message(UserMessage(text=prompt_creation))
            
            # Generate image using FAL.AI
            handler = await fal_client.submit_async(
                "fal-ai/flux/dev",
                arguments={
                    "prompt": f"Detective noir style, atmospheric lighting, cinematic composition: {image_prompt.strip()}",
                    "image_size": "landscape_4_3",
                    "num_inference_steps": 28,
                    "guidance_scale": 3.5
                }
            )
            
            result = await handler.get()
            
            if result.get("images") and len(result["images"]) > 0:
                image_url = result["images"][0]["url"]
                
                # Create scene object
                scene = VisualScene(
                    id=str(uuid.uuid4()),
                    title=f"Scene: {scene_type.title()}",
                    description=scene_context[:200] + "..." if len(scene_context) > 200 else scene_context,
                    image_url=image_url,
                    generated_from=scene_type,
                    context=scene_context,
                    character_involved=character_name,
                    timestamp=datetime.now()
                )
                
                # Add scene to case
                await db.cases.update_one(
                    {"id": case_id},
                    {"$push": {"visual_scenes": scene.model_dump()}}
                )
                
                return scene
            
            return None
            
        except Exception as e:
            print(f"Error generating visual scene: {e}")
            return None

    async def generate_crime_scene_image(self, case_id: str) -> Optional[str]:
        """Generate the main crime scene image for a case"""
        try:
            case = await db.cases.find_one({"id": case_id})
            if not case:
                return None
            
            await self.initialize_storyteller(str(uuid.uuid4()))
            
            # Create detailed crime scene prompt
            prompt_creation = f"""Create a detailed image generation prompt for this crime scene:

CASE: {case['title']}
SETTING: {case['setting']}
CRIME SCENE: {case['crime_scene_description']}
VICTIM: {case['victim_name']}

Create a detective noir crime scene image prompt that shows:
1. The actual crime scene location
2. Atmospheric detective noir lighting
3. Period-appropriate details from the setting
4. Mystery and intrigue without being graphic
5. Evidence or clues visible in the scene

Return ONLY the image prompt, nothing else. Make it cinematic and atmospheric."""

            image_prompt = await self.storyteller_ai.send_message(UserMessage(text=prompt_creation))
            
            # Generate image using FAL.AI
            handler = await fal_client.submit_async(
                "fal-ai/flux/dev",
                arguments={
                    "prompt": f"Detective noir crime scene, atmospheric lighting, cinematic mystery: {image_prompt.strip()}",
                    "image_size": "landscape_4_3",
                    "num_inference_steps": 28,
                    "guidance_scale": 3.5
                }
            )
            
            result = await handler.get()
            
            if result.get("images") and len(result["images"]) > 0:
                image_url = result["images"][0]["url"]
                
                # Update case with crime scene image
                await db.cases.update_one(
                    {"id": case_id},
                    {"$set": {"crime_scene_image_url": image_url}}
                )
                
                return image_url
            
            return None
            
        except Exception as e:
            print(f"Error generating crime scene image: {e}")
            return None

    async def generate_dynamic_character(self, case_id: str, role: str, context: str, session_id: str) -> Character:
        """Generate a new character based on a mention in conversation"""
        await self.initialize_storyteller(session_id)
        await self.initialize_logic_ai(session_id)
        
        # Get case details
        case = await db.cases.find_one({"id": case_id})
        if not case:
            return None
            
        prompt = f"""Create a new character for the detective mystery "{case['title']}" based on this mention:

CASE CONTEXT:
- Title: {case['title']}
- Setting: {case['setting']}
- Victim: {case['victim_name']}
- Crime scene: {case['crime_scene_description']}

CHARACTER MENTION:
- Role: {role}
- Context: {context}

Create a detailed character with:
1. A realistic name that fits the setting/time period
2. Physical description appropriate for their role
3. Background and how they relate to the case/location
4. A believable alibi for the time of the crime
5. A potential motive (even if weak) that could make them a person of interest
6. Make them a viable suspect but not obviously guilty

Return ONLY a JSON object with this structure:
{{
  "name": "Full Name",
  "description": "Brief physical description and personality",
  "background": "Their role, history, and connection to the case",
  "alibi": "What they claim they were doing during the crime",
  "motive": "Potential reason they might be involved (or 'No clear motive')"
}}"""

        response = await self.storyteller_ai.send_message(UserMessage(text=prompt))
        
        # Parse the character data
        try:
            import json
            char_data = json.loads(response.strip())
            
            # Validate with Logic AI
            validation_prompt = f"""Review this dynamically generated character for logical consistency:

CASE: {case['title']}
SETTING: {case['setting']}
NEW CHARACTER: {json.dumps(char_data, indent=2)}
ORIGINAL MENTION: "{context}"

Check:
1. Does the character fit the setting and time period?
2. Is their background realistic for their role?
3. Does their alibi make sense?
4. Is their potential motive believable?
5. Do they add value to the investigation?

If valid, respond with: VALID
If issues found, suggest improvements in this format: 
ISSUES: [list problems]
SUGGESTIONS: [improvements]"""

            validation = await self.logic_ai.send_message(UserMessage(text=validation_prompt))
            
            if "VALID" in validation:
                character = Character(
                    id=str(uuid.uuid4()),
                    name=char_data["name"],
                    description=char_data["description"],
                    background=char_data["background"],
                    alibi=char_data["alibi"],
                    motive=char_data.get("motive"),
                    is_culprit=False  # Dynamic characters are never the original culprit
                )
                return character
            else:
                print(f"Character validation failed: {validation}")
                return None
                
        except Exception as e:
            print(f"Error generating dynamic character: {e}")
            return None

    async def analyze_evidence(self, case_id: str, evidence_list: List[str], theory: str, session_id: str) -> str:
        """Analyze evidence and theory using Logic AI"""
        await self.initialize_logic_ai(session_id)
        
        # Get case details from database
        case = await db.cases.find_one({"id": case_id})
        if not case:
            return "Error: Case not found for analysis."
        
        # Get full evidence details
        evidence_details = []
        for evidence_id in evidence_list:
            for evidence in case["evidence"]:
                if evidence["id"] == evidence_id:
                    evidence_details.append(f"- {evidence['name']}: {evidence['description']} (Found: {evidence['location_found']}, Significance: {evidence['significance']})")
                    break
        
        evidence_text = "\n".join(evidence_details) if evidence_details else "No specific evidence selected"
        
        prompt = f"""Analyze the following detective theory and evidence for the case "{case['title']}":

CASE CONTEXT:
- Victim: {case['victim_name']}
- Setting: {case['setting']}
- Crime Scene: {case['crime_scene_description']}

DETECTIVE'S THEORY:
{theory}

EVIDENCE BEING CONSIDERED:
{evidence_text}

AVAILABLE CHARACTERS:
{', '.join([char['name'] + ' (' + char['description'] + ')' for char in case['characters']])}

Provide a logical analysis including:
1. **Strengths of this theory** - What evidence supports it?
2. **Weaknesses or gaps** - What doesn't add up or what's missing?
3. **Evidence relationships** - How do the selected pieces connect?
4. **Additional investigation needed** - What questions or evidence would strengthen/weaken this theory?
5. **Alternative explanations** - Other possible scenarios to consider
6. **Logical consistency check** - Does the timeline and evidence chain make sense?

Provide a thorough but focused analysis that helps guide the investigation."""

        response = await self.logic_ai.send_message(UserMessage(text=prompt))
        return response

    async def _generate_crime_scene_background(self, case_id: str):
        """Generate crime scene image in background without blocking case creation"""
        try:
            print(f"Starting background crime scene generation for case {case_id}")
            crime_scene_url = await self.generate_crime_scene_image(case_id)
            if crime_scene_url:
                print(f"Crime scene image generated successfully: {crime_scene_url}")
            else:
                print(f"Failed to generate crime scene image for case {case_id}")
        except Exception as e:
            print(f"Error in background crime scene generation: {e}")

# Initialize AI service
ai_service = DualAIDetectiveService()

@app.get("/")
async def root():
    return {"message": "Dual-AI Detective Game API", "status": "active"}

@app.post("/api/generate-case")
async def generate_case():
    """Generate a new mystery case with rate limiting"""
    try:
        session_id = str(uuid.uuid4())
        
        # Check rate limits before proceeding (Copilot recommendation)
        rate_limits = await token_tracker.check_rate_limits(session_id)
        if not rate_limits["within_limits"]:
            error_msg = "Rate limit exceeded."
            if rate_limits["cost_limit_exceeded"]:
                error_msg += f" Session cost limit: ${rate_limits['max_cost']}"
            if rate_limits["operations_limit_exceeded"]:
                error_msg += f" Operations limit: {rate_limits['max_operations']}/hour"
            raise HTTPException(status_code=429, detail=error_msg)
        
        case = await ai_service.generate_mystery_case(session_id)
        
        # Store in database
        await db.cases.insert_one(case.model_dump())
        
        # Return case without solution
        case_response = case.model_copy()
        case_response.solution = "Hidden until case is solved"
        
        return {"case": case_response, "session_id": session_id}
    except HTTPException:
        # Re-raise HTTP exceptions (like rate limiting)
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate case: {str(e)}")

@app.get("/api/cases/{case_id}")
async def get_case(case_id: str):
    """Get a specific case"""
    try:
        case = await db.cases.find_one({"id": case_id})
        if not case:
            raise HTTPException(status_code=404, detail="Case not found")
        
        # Remove MongoDB ObjectId and solution from response
        if "_id" in case:
            del case["_id"]
        
        # Convert any ObjectId to string to ensure JSON serialization
        def convert_objectid(obj):
            from bson import ObjectId
            if isinstance(obj, dict):
                return {k: convert_objectid(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [convert_objectid(item) for item in obj]
            elif isinstance(obj, ObjectId):
                return str(obj)
            else:
                return obj
        
        case = convert_objectid(case)
        case["solution"] = "Hidden until case is solved"
        
        return {"case": case}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve case: {str(e)}")

@app.post("/api/question-character")
async def question_character(request: QuestionRequest):
    """Question a character in the case"""
    try:
        # Get case data
        case = await db.cases.find_one({"id": request.case_id})
        if not case:
            raise HTTPException(status_code=404, detail="Case not found")
        
        # Find character
        character = None
        for char in case["characters"]:
            if char["id"] == request.character_id:
                character = char
                break
        
        if not character:
            raise HTTPException(status_code=404, detail="Character not found")
        
        # Generate response using AI and detect new character mentions
        session_id = str(uuid.uuid4())
        result = await ai_service.question_character(
            request.case_id, 
            character["name"], 
            request.question,
            session_id
        )
        
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        response_data = {
            "character_name": character["name"], 
            "response": result["response"],
            "new_characters_discovered": [],
            "visual_scene_generated": None
        }
        
        # Process any new character mentions
        if result["new_character_mentions"]:
            for mention in result["new_character_mentions"]:
                # Generate the new character
                new_character = await ai_service.generate_dynamic_character(
                    request.case_id,
                    mention["role"],
                    mention["context"],
                    session_id
                )
                
                if new_character:
                    # Add to case in database
                    await db.cases.update_one(
                        {"id": request.case_id},
                        {"$push": {"characters": new_character.model_dump()}}
                    )
                    
                    response_data["new_characters_discovered"].append({
                        "character": new_character.model_dump(),
                        "discovered_through": character["name"],
                        "context": mention["context"]
                    })
        
        # Check if response contains visual descriptions that could be turned into scenes
        response_text = result["response"].lower()
        visual_triggers = ["i saw", "i witnessed", "there was", "i noticed", "i remember seeing", "picture this", "imagine"]
        
        if any(trigger in response_text for trigger in visual_triggers) and len(result["response"]) > 50:
            try:
                # Generate visual scene from testimony
                visual_scene = await ai_service.generate_visual_scene(
                    request.case_id,
                    f"{character['name']} testified: {result['response']}",
                    "testimony",
                    character["name"]
                )
                
                if visual_scene:
                    response_data["visual_scene_generated"] = visual_scene.model_dump()
                    
            except Exception as e:
                print(f"Error generating visual scene from testimony: {e}")
        
        return response_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to question character: {str(e)}")

@app.post("/api/generate-dynamic-character")
async def generate_dynamic_character_endpoint(case_id: str, role: str, context: str):
    """Generate a new character based on a mention"""
    try:
        session_id = str(uuid.uuid4())
        character = await ai_service.generate_dynamic_character(case_id, role, context, session_id)
        
        if character:
            # Add to case in database
            await db.cases.update_one(
                {"id": case_id},
                {"$push": {"characters": character.model_dump()}}
            )
            return {"character": character.model_dump()}
        else:
            raise HTTPException(status_code=500, detail="Failed to generate character")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate dynamic character: {str(e)}")

@app.post("/api/generate-visual-scene")
async def generate_visual_scene_endpoint(case_id: str, scene_context: str, scene_type: str = "manual"):
    """Generate a visual scene for a specific context"""
    try:
        session_id = str(uuid.uuid4())
        scene = await ai_service.generate_visual_scene(case_id, scene_context, scene_type)
        
        if scene:
            return {"scene": scene.model_dump()}
        else:
            raise HTTPException(status_code=500, detail="Failed to generate visual scene")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate visual scene: {str(e)}")

@app.get("/api/case-scenes/{case_id}")
async def get_case_scenes(case_id: str):
    """Get all visual scenes for a case"""
    try:
        case = await db.cases.find_one({"id": case_id})
        if not case:
            raise HTTPException(status_code=404, detail="Case not found")
        
        scenes = case.get("visual_scenes", [])
        return {"scenes": scenes}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get case scenes: {str(e)}")

@app.post("/api/analyze-evidence")
async def analyze_evidence(request: AnalysisRequest):
    """Analyze evidence and theory using Logic AI"""
    try:
        session_id = str(uuid.uuid4())
        analysis = await ai_service.analyze_evidence(
            request.case_id,
            request.evidence_ids,
            request.theory,
            session_id
        )
        
        return {"analysis": analysis}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to analyze evidence: {str(e)}")

# Token Usage Monitoring Endpoints
@app.get("/api/usage/session/{session_id}")
async def get_session_usage(session_id: str):
    """
    Get real-time token usage for a specific session.
    Implements Copilot's monitoring recommendation.
    """
    try:
        usage = await token_tracker.get_session_usage(session_id)
        return {"success": True, "usage": usage}
    except Exception as e:
        logger.error(f"Error getting session usage: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve session usage")

@app.get("/api/usage/statistics")
async def get_usage_statistics(days: int = 30):
    """
    Get comprehensive usage statistics for the specified number of days.
    Provides service breakdown, operation costs, and trends.
    """
    try:
        stats = await token_tracker.get_usage_statistics(days)
        return {"success": True, "statistics": stats.model_dump()}
    except Exception as e:
        logger.error(f"Error getting usage statistics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve usage statistics")

@app.get("/api/usage/rate-limits/{session_id}")
async def check_session_rate_limits(session_id: str):
    """
    Check if a session is within rate limits.
    Implements Copilot's rate limiting recommendation.
    """
    try:
        limits = await token_tracker.check_rate_limits(session_id)
        return {"success": True, "rate_limits": limits}
    except Exception as e:
        logger.error(f"Error checking rate limits: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to check rate limits")

@app.get("/api/usage/records")
async def get_usage_records(session_id: Optional[str] = None, limit: int = 100):
    """
    Get detailed usage records for debugging and analysis.
    Optionally filter by session ID.
    """
    try:
        query = {}
        if session_id:
            query["session_id"] = session_id
        
        records = await db.token_usage.find(query).sort("timestamp", -1).limit(limit).to_list(None)
        
        # Convert ObjectIds to strings for JSON serialization
        for record in records:
            if "_id" in record:
                del record["_id"]
        
        return {"success": True, "records": records, "count": len(records)}
    except Exception as e:
        logger.error(f"Error getting usage records: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve usage records")

# Automated Prompt Testing Endpoints
@app.post("/api/testing/run-tests")
async def run_prompt_tests(test_types: Optional[List[str]] = None):
    """
    Run automated prompt tests for all or specific prompt types.
    Implements Copilot's automated testing recommendation.
    """
    try:
        session_id = f"test_session_{str(uuid.uuid4())}"
        
        # Run test suite
        test_suite = await prompt_tester.run_test_suite(session_id, test_types)
        
        # Return comprehensive results
        return {
            "success": True,
            "test_suite": test_suite.model_dump(),
            "summary": {
                "tests_run": test_suite.tests_run,
                "tests_passed": test_suite.tests_passed,
                "tests_failed": test_suite.tests_failed,
                "success_rate": f"{test_suite.success_rate:.1f}%",
                "total_cost": f"${test_suite.total_cost:.4f}",
                "execution_time": f"{test_suite.total_execution_time:.2f}s"
            }
        }
    except Exception as e:
        logger.error(f"Error running prompt tests: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to run prompt tests: {str(e)}")

@app.get("/api/testing/test-cases")
async def get_test_cases():
    """
    Get all available test cases and their configurations.
    """
    try:
        test_cases = prompt_tester.test_cases
        return {
            "success": True,
            "test_cases": [tc.model_dump() for tc in test_cases],
            "count": len(test_cases)
        }
    except Exception as e:
        logger.error(f"Error getting test cases: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve test cases")

@app.get("/api/testing/test-history")
async def get_test_history(limit: int = 10):
    """
    Get historical test suite results for monitoring trends.
    """
    try:
        # Get recent test suites from database
        test_suites = await db.prompt_test_suites.find({}).sort("timestamp", -1).limit(limit).to_list(None)
        
        # Convert ObjectIds to strings for JSON serialization
        for suite in test_suites:
            if "_id" in suite:
                del suite["_id"]
        
        return {
            "success": True,
            "test_suites": test_suites,
            "count": len(test_suites)
        }
    except Exception as e:
        logger.error(f"Error getting test history: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve test history")

@app.post("/api/testing/validate-prompt")
async def validate_single_prompt(prompt_type: str, prompt_text: str, service: str = "openai"):
    """
    Test and validate a single custom prompt.
    Useful for debugging and developing new prompts.
    """
    try:
        session_id = f"validation_session_{str(uuid.uuid4())}"
        
        # Create a temporary test case
        test_case = PromptTestCase(
            id=f"custom_test_{str(uuid.uuid4())}",
            name="Custom Prompt Validation",
            prompt_type=prompt_type,
            service=service,
            test_input={},
            expected_format={},
            validation_rules=["response_not_empty"],
            description="Custom prompt validation"
        )
        
        # Override the prompt building for custom validation
        original_build_prompt = prompt_tester._build_test_prompt
        prompt_tester._build_test_prompt = lambda tc: prompt_text
        
        try:
            # Run the test
            result = await prompt_tester.run_single_test(test_case, session_id)
            
            return {
                "success": True,
                "test_result": result.model_dump(),
                "validation": {
                    "response_received": result.response_received,
                    "json_parse_success": result.json_parse_success,
                    "validation_passed": result.validation_passed,
                    "execution_time": f"{result.execution_time:.2f}s",
                    "estimated_cost": f"${result.estimated_cost:.4f}",
                    "token_count": result.token_count
                }
            }
        finally:
            # Restore original method
            prompt_tester._build_test_prompt = original_build_prompt
            
    except Exception as e:
        logger.error(f"Error validating prompt: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to validate prompt: {str(e)}")

@app.get("/api/testing/health-report")
async def get_prompt_health_report():
    """
    Get a comprehensive health report of all prompt types.
    Shows success rates, common failures, and trends.
    """
    try:
        # Get recent test results from database
        recent_suites = await db.prompt_test_suites.find({}).sort("timestamp", -1).limit(5).to_list(None)
        
        if not recent_suites:
            return {
                "success": True,
                "report": {
                    "overall_health": "No test data available",
                    "recommendation": "Run prompt tests to generate health report"
                }
            }
        
        # Analyze health trends
        prompt_type_stats = defaultdict(lambda: {"total": 0, "passed": 0, "failures": []})
        overall_success_rates = []
        
        for suite in recent_suites:
            overall_success_rates.append(suite.get("success_rate", 0))
            
            for result in suite.get("results", []):
                prompt_type = result.get("test_case_name", "unknown")
                prompt_type_stats[prompt_type]["total"] += 1
                
                if result.get("success", False):
                    prompt_type_stats[prompt_type]["passed"] += 1
                else:
                    prompt_type_stats[prompt_type]["failures"].append(
                        result.get("error_message", "Unknown error")
                    )
        
        # Calculate health metrics
        overall_avg_success = sum(overall_success_rates) / len(overall_success_rates) if overall_success_rates else 0
        
        health_by_type = {}
        for prompt_type, stats in prompt_type_stats.items():
            success_rate = (stats["passed"] / stats["total"]) * 100 if stats["total"] > 0 else 0
            health_by_type[prompt_type] = {
                "success_rate": f"{success_rate:.1f}%",
                "total_tests": stats["total"],
                "passed_tests": stats["passed"],
                "common_failures": list(set(stats["failures"][:3]))  # Top 3 unique failures
            }
        
        # Determine overall health status
        if overall_avg_success >= 90:
            health_status = "Excellent"
        elif overall_avg_success >= 75:
            health_status = "Good"
        elif overall_avg_success >= 50:
            health_status = "Fair"
        else:
            health_status = "Poor"
        
        return {
            "success": True,
            "report": {
                "overall_health": health_status,
                "overall_success_rate": f"{overall_avg_success:.1f}%",
                "prompt_type_health": health_by_type,
                "recent_test_count": len(recent_suites),
                "recommendation": "Run tests regularly to monitor prompt reliability" if health_status == "Excellent" else "Review failing prompt types and consider prompt optimization"
            }
        }
        
    except Exception as e:
        logger.error(f"Error generating health report: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate health report")

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "ai_services": "dual-ai-active"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)