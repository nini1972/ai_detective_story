
import requests
import sys
import os
import json
import time
import uuid
from datetime import datetime
from pprint import pprint

class DetectiveGameAPITester:
    def __init__(self, base_url):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.case_id = None
        self.session_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_content = response.json()
                    print(f"Error response: {error_content}")
                except:
                    print(f"Error response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test the health check endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "api/health",
            200
        )
        return success

    def test_generate_case(self):
        """Test case generation"""
        success, response = self.run_test(
            "Generate Case",
            "POST",
            "api/generate-case",
            200
        )
        
        if success and 'case' in response:
            self.case_id = response['case']['id']
            self.session_id = response.get('session_id')
            print(f"Generated case ID: {self.case_id}")
            print(f"Session ID: {self.session_id}")
            return True
        return False

    def test_get_case(self):
        """Test retrieving a case"""
        if not self.case_id:
            print("❌ No case ID available for testing")
            return False
            
        success, response = self.run_test(
            "Get Case",
            "GET",
            f"api/cases/{self.case_id}",
            200
        )
        
        if success and 'case' in response:
            print(f"Retrieved case title: {response['case']['title']}")
            return True
        return False

    def test_question_character(self):
        """Test questioning a character"""
        if not self.case_id:
            print("❌ No case ID available for testing")
            return False
            
        # First get the case to find a character
        success, response = self.run_test(
            "Get Case for Character",
            "GET",
            f"api/cases/{self.case_id}",
            200
        )
        
        if not success or 'case' not in response:
            return False
            
        if not response['case']['characters'] or len(response['case']['characters']) == 0:
            print("❌ No characters available in the case")
            return False
            
        character = response['case']['characters'][0]
        character_id = character['id']
        character_name = character['name']
        
        print(f"Testing questioning character: {character_name}")
        
        success, response = self.run_test(
            "Question Character",
            "POST",
            "api/question-character",
            200,
            data={
                "case_id": self.case_id,
                "character_id": character_id,
                "question": "Where were you at the time of the crime?"
            }
        )
        
        if success and 'response' in response:
            print(f"Character response received, length: {len(response['response'])}")
            return True
        return False

    def test_analyze_evidence(self):
        """Test evidence analysis"""
        if not self.case_id:
            print("❌ No case ID available for testing")
            return False
            
        # First get the case to find evidence
        success, response = self.run_test(
            "Get Case for Evidence",
            "GET",
            f"api/cases/{self.case_id}",
            200
        )
        
        if not success or 'case' not in response:
            return False
            
        if not response['case']['evidence'] or len(response['case']['evidence']) == 0:
            print("❌ No evidence available in the case")
            return False
            
        # Select the first piece of evidence
        evidence = response['case']['evidence'][0]
        evidence_id = evidence['id']
        
        success, response = self.run_test(
            "Analyze Evidence",
            "POST",
            "api/analyze-evidence",
            200,
            data={
                "case_id": self.case_id,
                "evidence_ids": [evidence_id],
                "theory": "I believe the crime was committed by someone with access to the victim's personal items."
            }
        )
        
        if success and 'analysis' in response:
            print(f"Analysis received, length: {len(response['analysis'])}")
            return True
        return False

def main():
    # Get the backend URL from environment or use the one from frontend/.env
    backend_url = os.environ.get("BACKEND_URL")
    
    if not backend_url:
        try:
            with open('/app/frontend/.env', 'r') as f:
                for line in f:
                    if line.startswith('REACT_APP_BACKEND_URL='):
                        backend_url = line.strip().split('=')[1]
                        break
        except Exception as e:
            print(f"Error reading .env file: {e}")
    
    if not backend_url:
        print("❌ No backend URL found. Please set BACKEND_URL environment variable.")
        return 1
        
    print(f"Using backend URL: {backend_url}")
    
    # Setup tester
    tester = DetectiveGameAPITester(backend_url)
    
    # Run tests
    print("\n🔍 Starting API Tests for Detective Game\n")
    
    # Test health check
    if not tester.test_health_check():
        print("❌ Health check failed, stopping tests")
        return 1
        
    # Test case generation
    if not tester.test_generate_case():
        print("❌ Case generation failed, stopping tests")
        return 1
        
    # Test get case
    if not tester.test_get_case():
        print("❌ Get case failed, stopping tests")
        return 1
        
    # Test question character
    if not tester.test_question_character():
        print("❌ Question character failed, stopping tests")
        return 1
        
    # Test analyze evidence
    if not tester.test_analyze_evidence():
        print("❌ Analyze evidence failed, stopping tests")
        return 1
    
    # Print results
    print(f"\n📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())
