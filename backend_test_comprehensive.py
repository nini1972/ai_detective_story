import requests
import sys
import time
from datetime import datetime

class DetectiveGameTester:
    def __init__(self, base_url="https://37297b10-ea2f-4f93-8af1-e8679821cf30.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.case_id = None
        self.session_id = None
        self.character_id = None
        self.character_name = None
        self.visual_scenes = []

    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
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
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")

            return success, response.json() if success else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_endpoint(self):
        """Test the health endpoint"""
        success, response = self.run_test(
            "Health Endpoint",
            "GET",
            "health",
            200
        )
        if success:
            print(f"Health status: {response}")
        return success

    def test_generate_case(self):
        """Test case generation"""
        success, response = self.run_test(
            "Generate Case",
            "POST",
            "generate-case",
            200,
            data={}
        )
        if success:
            self.case_id = response.get('case', {}).get('id')
            self.session_id = response.get('session_id')
            case_data = response.get('case', {})
            
            print(f"Generated case ID: {self.case_id}")
            print(f"Session ID: {self.session_id}")
            print(f"Case title: {case_data.get('title')}")
            print(f"Setting: {case_data.get('setting')}")
            print(f"Victim: {case_data.get('victim_name')}")
            print(f"Number of characters: {len(case_data.get('characters', []))}")
            print(f"Number of evidence items: {len(case_data.get('evidence', []))}")
            
            if case_data.get('crime_scene_image_url'):
                print(f"✅ Crime scene image generated: {case_data.get('crime_scene_image_url')}")
            else:
                print(f"❌ No crime scene image generated")
            
            if case_data.get('characters'):
                self.character_id = case_data['characters'][0]['id']
                self.character_name = case_data['characters'][0]['name']
                print(f"First character: {self.character_name}")
            
            # Wait for case to be fully processed
            print("\nWaiting for case to be fully processed...")
            time.sleep(5)
            
        return success

    def test_get_case(self):
        """Test retrieving a case"""
        if not self.case_id:
            print("❌ No case ID available for testing")
            return False
            
        success, response = self.run_test(
            "Get Case",
            "GET",
            f"cases/{self.case_id}",
            200
        )
        if success:
            print(f"Retrieved case title: {response.get('title')}")
            
            if response.get('crime_scene_image_url'):
                print(f"✅ Crime scene image present: {response.get('crime_scene_image_url')}")
            else:
                print(f"❌ No crime scene image present")
                
            # Store the initial number of visual scenes
            self.visual_scenes = response.get('visual_scenes', [])
            
        return success

    def test_get_case_scenes(self):
        """Test retrieving case scenes"""
        if not self.case_id:
            print("❌ No case ID available for testing")
            return False
            
        success, response = self.run_test(
            "Get Case Scenes",
            "GET",
            f"case-scenes/{self.case_id}",
            200
        )
        if success:
            scenes = response.get('scenes', [])
            print(f"Retrieved {len(scenes)} visual scenes")
            
        return success

    def test_question_character(self, question, visual_trigger=False):
        """Test questioning a character"""
        if not self.case_id or not self.character_id:
            print("❌ No case ID or character ID available for testing")
            return False
            
        print(f"\n🔍 Testing {('visual' if visual_trigger else 'regular')} question: '{question}'")
        
        success, response = self.run_test(
            "Question Character",
            "POST",
            "question-character",
            200,
            data={
                "case_id": self.case_id,
                "character_id": self.character_id,
                "question": question
            }
        )
        if success:
            print(f"Character name: {response.get('character_name')}")
            print(f"Response: {response.get('response')}")
            
            # Check for visual scene generation
            if response.get('visual_scene_generated'):
                scene = response.get('visual_scene_generated')
                print(f"\n🎬 VISUAL SCENE GENERATED!")
                print(f"  - Title: {scene.get('title')}")
                print(f"  - Description: {scene.get('description')[:100]} ...")
                print(f"  - Image URL: {scene.get('image_url')}")
                print(f"  - Generated from: {scene.get('generated_from')}")
                print(f"  - Character involved: {scene.get('character_involved')}")
                
                if visual_trigger:
                    print(f"✅ Visual scene generated from visual trigger question!")
                else:
                    print(f"✅ Visual scene generated from regular question (unexpected but good!)")
                    
                # Add to our list of visual scenes
                self.visual_scenes.append(scene)
            elif visual_trigger:
                print(f"❌ No visual scene generated from visual trigger question")
                
            # Check for new character discovery
            if response.get('new_characters_discovered'):
                new_chars = response.get('new_characters_discovered')
                print(f"\n👤 NEW CHARACTERS DISCOVERED: {len(new_chars)}")
                for char_data in new_chars:
                    print(f"  - {char_data.get('character', {}).get('name')}")
                    print(f"    Discovered through: {char_data.get('discovered_through')}")
                    print(f"    Context: {char_data.get('context')}")
                
        return success

    def test_analyze_evidence(self, evidence_ids, theory):
        """Test evidence analysis"""
        if not self.case_id:
            print("❌ No case ID available for testing")
            return False
            
        success, response = self.run_test(
            "Analyze Evidence",
            "POST",
            "analyze-evidence",
            200,
            data={
                "case_id": self.case_id,
                "evidence_ids": evidence_ids,
                "theory": theory
            }
        )
        if success:
            print(f"Analysis received: {response.get('analysis')[:100]} ...")
            
        return success

    def test_visual_testimony_system(self):
        """Test the visual testimony system with trigger phrases"""
        print("\n==================================================")
        print("TESTING VISUAL TESTIMONY SYSTEM")
        print("==================================================")
        
        # First check the initial state
        success, response = self.run_test(
            "Get Initial Case State",
            "GET",
            f"cases/{self.case_id}",
            200
        )
        if success:
            initial_scenes_count = len(response.get('visual_scenes', []))
            print(f"Initial visual scenes count: {initial_scenes_count}")
        
        # Test visual trigger phrases
        visual_trigger_phrases = [
            "What exactly did you see that night?",
            "Describe what happened in detail",
            "Tell me about the scene when you found the body",
            "What did the scene look like?"
        ]
        
        scenes_generated = 0
        for i, phrase in enumerate(visual_trigger_phrases[:2]):  # Test first 2 phrases
            success = self.test_question_character(phrase, visual_trigger=True)
            if not success:
                break
                
            # Check if a new scene was generated
            if len(self.visual_scenes) > initial_scenes_count + scenes_generated:
                scenes_generated += 1
        
        # Final check of visual scenes
        success, response = self.run_test(
            "Get Final Case State",
            "GET",
            f"cases/{self.case_id}",
            200
        )
        if success:
            final_scenes_count = len(response.get('visual_scenes', []))
            print(f"\nFinal visual scenes count: {final_scenes_count}")
            print(f"New scenes generated during test: {final_scenes_count - initial_scenes_count}")
            
            if final_scenes_count > initial_scenes_count:
                print("✅ Visual testimony system is working!")
            else:
                print("❌ No new visual scenes were generated")
        
        return scenes_generated > 0

def main():
    print("==================================================")
    print("AI-POWERED VISUAL TESTIMONY SYSTEM TESTER")
    print("==================================================")
    
    tester = DetectiveGameTester()
    
    # Test health endpoint
    if not tester.test_health_endpoint():
        print("❌ Health endpoint test failed, stopping tests")
        return 1
    
    # Test case generation
    if not tester.test_generate_case():
        print("❌ Case generation test failed, stopping tests")
        return 1
    
    # Test getting case details
    if not tester.test_get_case():
        print("❌ Get case test failed, stopping tests")
        return 1
    
    # Test the visual testimony system
    tester.test_visual_testimony_system()
    
    # Test evidence analysis with a simple theory
    if tester.case_id:
        # Get evidence IDs from the case
        success, response = tester.run_test(
            "Get Case for Evidence IDs",
            "GET",
            f"cases/{tester.case_id}",
            200
        )
        if success and response.get('evidence'):
            evidence_ids = [evidence['id'] for evidence in response.get('evidence', [])[:2]]
            if evidence_ids:
                tester.test_analyze_evidence(
                    evidence_ids,
                    "I believe the murder was committed by the first suspect because of the evidence found at the scene."
                )
    
    # Print results
    print("\n==================================================")
    print(f"TESTS PASSED: {tester.tests_passed}/{tester.tests_run}")
    print("==================================================")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())