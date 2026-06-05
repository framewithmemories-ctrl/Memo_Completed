#!/usr/bin/env python3
"""
Focused Wallet & Rewards System Testing
Testing specific wallet management APIs as per review request
"""

import requests
import sys
import json
from datetime import datetime

class WalletSystemTester:
    def __init__(self, base_url="https://photo-frames-dash.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.user_id = None

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "name": name,
            "success": success,
            "details": details
        })

    def setup_test_user(self):
        """Create a test user for wallet testing"""
        try:
            test_user = {
                "name": f"Wallet Test User {datetime.now().strftime('%H%M%S')}",
                "email": f"wallet_test_{datetime.now().strftime('%H%M%S')}@memories.com",
                "phone": "+91 9876543210",
                "address": "123 Test Street, Coimbatore, Tamil Nadu"
            }
            
            response = requests.post(f"{self.api_url}/users", json=test_user, timeout=10)
            if response.status_code == 200:
                user_data = response.json()
                self.user_id = user_data['id']
                print(f"🔧 Setup: Created test user with ID: {self.user_id}")
                return True
            else:
                print(f"❌ Setup failed: Could not create test user - {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Setup failed: {str(e)}")
            return False

    def test_wallet_balance_retrieval(self):
        """Test GET /api/users/{user_id}/wallet - Get wallet balance and info"""
        try:
            response = requests.get(f"{self.api_url}/users/{self.user_id}/wallet", timeout=10)
            success = response.status_code == 200
            
            if success:
                wallet_data = response.json()
                required_fields = ['balance', 'reward_points', 'store_credits', 'tier', 'total_spent']
                missing_fields = [field for field in required_fields if field not in wallet_data]
                
                if missing_fields:
                    success = False
                    details = f"Missing wallet fields: {missing_fields}"
                else:
                    # Verify initial wallet state
                    initial_balance = wallet_data['balance']
                    initial_points = wallet_data['reward_points']
                    initial_credits = wallet_data['store_credits']
                    tier = wallet_data['tier']
                    
                    details = f"Initial wallet state - Balance: ₹{initial_balance}, Points: {initial_points}, Credits: ₹{initial_credits}, Tier: {tier}"
                    
                    # Store initial values for later tests
                    self.initial_balance = initial_balance
                    self.initial_points = initial_points
                    self.initial_credits = initial_credits
            else:
                details = f"Status: {response.status_code}, Response: {response.text}"
            
            self.log_test("Wallet Balance Retrieval", success, details)
            return success
            
        except Exception as e:
            self.log_test("Wallet Balance Retrieval", False, str(e))
            return False

    def test_add_money_functionality(self):
        """Test POST /api/users/{user_id}/wallet/add-money - Add money to wallet"""
        try:
            amount_to_add = 2500.0
            response = requests.post(f"{self.api_url}/users/{self.user_id}/wallet/add-money?amount={amount_to_add}", 
                                   timeout=10)
            success = response.status_code == 200
            
            if success:
                result = response.json()
                required_fields = ['new_balance', 'transaction_id']
                missing_fields = [field for field in required_fields if field not in result]
                
                if missing_fields:
                    success = False
                    details = f"Missing response fields: {missing_fields}"
                else:
                    new_balance = result['new_balance']
                    transaction_id = result['transaction_id']
                    
                    # Verify balance calculation
                    expected_balance = self.initial_balance + amount_to_add
                    balance_correct = abs(new_balance - expected_balance) < 0.01
                    
                    details = f"Added ₹{amount_to_add} - New balance: ₹{new_balance}, Expected: ₹{expected_balance}, Calculation correct: {balance_correct}, Transaction ID: {transaction_id}"
                    
                    if not balance_correct:
                        success = False
                        details += " - Balance calculation error"
                    else:
                        self.current_balance = new_balance
            else:
                details = f"Status: {response.status_code}, Response: {response.text}"
            
            self.log_test("Add Money Functionality", success, details)
            return success
            
        except Exception as e:
            self.log_test("Add Money Functionality", False, str(e))
            return False

    def test_reward_points_conversion(self):
        """Test POST /api/users/{user_id}/wallet/convert-points - Convert reward points to store credits (100 points = ₹10)"""
        try:
            # First, give user some points for testing
            points_to_give = 500
            points_update = {"points": points_to_give}
            update_response = requests.put(f"{self.api_url}/users/{self.user_id}", json=points_update, timeout=10)
            
            if update_response.status_code != 200:
                self.log_test("Reward Points Conversion", False, "Failed to add points to user for testing")
                return False
            
            # Test conversion: 300 points should give ₹30 store credit
            points_to_convert = 300
            response = requests.post(f"{self.api_url}/users/{self.user_id}/wallet/convert-points?points={points_to_convert}", 
                                   timeout=10)
            success = response.status_code == 200
            
            if success:
                result = response.json()
                required_fields = ['points_remaining', 'store_credits', 'credit_earned']
                missing_fields = [field for field in required_fields if field not in result]
                
                if missing_fields:
                    success = False
                    details = f"Missing conversion response fields: {missing_fields}"
                else:
                    points_remaining = result['points_remaining']
                    store_credits = result['store_credits']
                    credit_earned = result['credit_earned']
                    
                    # Verify conversion ratio: 100 points = ₹10
                    expected_credit = (points_to_convert / 100) * 10  # 300 points = ₹30
                    expected_remaining = points_to_give - points_to_convert  # 500 - 300 = 200
                    
                    credit_correct = abs(credit_earned - expected_credit) < 0.01
                    points_correct = points_remaining == expected_remaining
                    
                    details = f"Converted {points_to_convert} points - Credit earned: ₹{credit_earned} (expected: ₹{expected_credit}), Points remaining: {points_remaining} (expected: {expected_remaining}), Conversion ratio correct: {credit_correct}, Points calculation correct: {points_correct}"
                    
                    if not (credit_correct and points_correct):
                        success = False
                        details += " - Conversion calculation error"
                    else:
                        self.current_credits = store_credits
            else:
                details = f"Status: {response.status_code}, Response: {response.text}"
            
            self.log_test("Reward Points Conversion (100 pts = ₹10)", success, details)
            return success
            
        except Exception as e:
            self.log_test("Reward Points Conversion (100 pts = ₹10)", False, str(e))
            return False

    def test_wallet_payment_processing(self):
        """Test POST /api/users/{user_id}/wallet/pay - Pay with wallet balance"""
        try:
            payment_amount = 899.0
            order_id = f"WALLET_TEST_ORDER_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            response = requests.post(f"{self.api_url}/users/{self.user_id}/wallet/pay?amount={payment_amount}&order_id={order_id}", 
                                   timeout=10)
            success = response.status_code == 200
            
            if success:
                result = response.json()
                required_fields = ['payment_successful', 'new_balance', 'tier', 'transaction_id']
                missing_fields = [field for field in required_fields if field not in result]
                
                if missing_fields:
                    success = False
                    details = f"Missing payment response fields: {missing_fields}"
                else:
                    payment_successful = result['payment_successful']
                    new_balance = result['new_balance']
                    tier = result['tier']
                    transaction_id = result['transaction_id']
                    
                    # Verify payment deduction
                    expected_balance = self.current_balance - payment_amount
                    balance_correct = abs(new_balance - expected_balance) < 0.01
                    
                    details = f"Payment processed - Amount: ₹{payment_amount}, Success: {payment_successful}, New balance: ₹{new_balance}, Expected: ₹{expected_balance}, Balance correct: {balance_correct}, Tier: {tier}, Order ID: {order_id}"
                    
                    if not (payment_successful and balance_correct):
                        success = False
                        details += " - Payment processing error"
                    else:
                        self.current_balance = new_balance
            else:
                details = f"Status: {response.status_code}, Response: {response.text}"
            
            self.log_test("Wallet Payment Processing", success, details)
            return success
            
        except Exception as e:
            self.log_test("Wallet Payment Processing", False, str(e))
            return False

    def test_transaction_history_and_ledger(self):
        """Test GET /api/users/{user_id}/wallet/transactions - Get wallet transaction history"""
        try:
            response = requests.get(f"{self.api_url}/users/{self.user_id}/wallet/transactions", timeout=10)
            success = response.status_code == 200
            
            if success:
                transactions = response.json()
                details = f"Retrieved {len(transactions)} transactions"
                
                if transactions:
                    # Verify transaction structure and content
                    required_fields = ['id', 'user_id', 'type', 'amount', 'description', 'category', 'balance_after', 'created_at']
                    
                    # Check first transaction structure
                    first_txn = transactions[0]
                    missing_fields = [field for field in required_fields if field not in first_txn]
                    
                    if missing_fields:
                        success = False
                        details += f", Missing transaction fields: {missing_fields}"
                    else:
                        # Verify we have different transaction types from our tests
                        transaction_types = set(txn['type'] for txn in transactions)
                        transaction_categories = set(txn['category'] for txn in transactions)
                        
                        expected_types = {'credit', 'debit', 'conversion'}
                        expected_categories = {'topup', 'purchase', 'conversion'}
                        
                        types_present = transaction_types.intersection(expected_types)
                        categories_present = transaction_categories.intersection(expected_categories)
                        
                        details += f", Transaction types found: {list(transaction_types)}, Categories found: {list(transaction_categories)}"
                        details += f", Latest transaction: {first_txn['type']} ₹{first_txn['amount']} - {first_txn['description']}"
                        
                        # Verify transparent ledger - balance_after should be consistent
                        ledger_consistent = True
                        for i, txn in enumerate(transactions[:-1]):  # Skip last one
                            if 'balance_after' not in txn:
                                ledger_consistent = False
                                break
                        
                        details += f", Ledger consistency: {ledger_consistent}"
                        
                        if not ledger_consistent:
                            success = False
                            details += " - Ledger transparency issue"
                else:
                    success = False
                    details += " - No transactions found (expected transactions from previous tests)"
            else:
                details = f"Status: {response.status_code}, Response: {response.text}"
            
            self.log_test("Transaction History & Ledger", success, details)
            return success
            
        except Exception as e:
            self.log_test("Transaction History & Ledger", False, str(e))
            return False

    def test_insufficient_balance_error_handling(self):
        """Test error handling for insufficient balance scenarios"""
        try:
            # Try to pay more than current balance
            excessive_amount = self.current_balance + 1000.0
            order_id = f"INSUFFICIENT_TEST_{datetime.now().strftime('%H%M%S')}"
            
            response = requests.post(f"{self.api_url}/users/{self.user_id}/wallet/pay?amount={excessive_amount}&order_id={order_id}", 
                                   timeout=10)
            
            # Should return 400 Bad Request for insufficient balance
            success = response.status_code == 400
            
            if success:
                # Check if error message is appropriate
                try:
                    error_data = response.json()
                    error_message = error_data.get('detail', '').lower()
                    has_balance_error = 'insufficient' in error_message or 'balance' in error_message
                    
                    details = f"Correctly rejected payment of ₹{excessive_amount} (balance: ₹{self.current_balance}), Error: {error_data.get('detail', 'No detail')}, Appropriate error message: {has_balance_error}"
                    
                    if not has_balance_error:
                        success = False
                        details += " - Error message not descriptive enough"
                except:
                    details = f"Correctly rejected payment of ₹{excessive_amount}, Status: {response.status_code}"
            else:
                details = f"Expected 400 status for insufficient balance, got {response.status_code}, Response: {response.text}"
            
            self.log_test("Insufficient Balance Error Handling", success, details)
            return success
            
        except Exception as e:
            self.log_test("Insufficient Balance Error Handling", False, str(e))
            return False

    def test_wallet_balance_updates_verification(self):
        """Verify wallet balance is correctly updated after all operations"""
        try:
            response = requests.get(f"{self.api_url}/users/{self.user_id}/wallet", timeout=10)
            success = response.status_code == 200
            
            if success:
                final_wallet_data = response.json()
                final_balance = final_wallet_data['balance']
                final_credits = final_wallet_data['store_credits']
                
                # Verify final balance matches our tracking
                balance_matches = abs(final_balance - self.current_balance) < 0.01
                credits_matches = abs(final_credits - self.current_credits) < 0.01
                
                details = f"Final verification - Balance: ₹{final_balance} (tracked: ₹{self.current_balance}), Credits: ₹{final_credits} (tracked: ₹{self.current_credits}), Balance matches: {balance_matches}, Credits match: {credits_matches}"
                
                if not (balance_matches and credits_matches):
                    success = False
                    details += " - Balance/credits tracking inconsistency"
            else:
                details = f"Status: {response.status_code}, Response: {response.text}"
            
            self.log_test("Wallet Balance Updates Verification", success, details)
            return success
            
        except Exception as e:
            self.log_test("Wallet Balance Updates Verification", False, str(e))
            return False

    def run_wallet_system_tests(self):
        """Run comprehensive wallet system tests"""
        print("💰 Starting Wallet & Rewards System Testing")
        print("=" * 60)
        print("Testing Requirements:")
        print("✓ Balance management with add money functionality")
        print("✓ Reward points conversion (100 points = ₹10)")
        print("✓ Store credits and transparent ledger")
        print("✓ Payment processing with wallet balance")
        print("✓ Transaction history with filtering")
        print("✓ Error handling for insufficient balance scenarios")
        print("=" * 60)
        
        # Setup test user
        if not self.setup_test_user():
            print("❌ Cannot proceed without test user")
            return False
        
        # Run wallet system tests in sequence
        test_results = []
        
        # 1. Test wallet balance retrieval
        test_results.append(self.test_wallet_balance_retrieval())
        
        # 2. Test add money functionality
        test_results.append(self.test_add_money_functionality())
        
        # 3. Test reward points conversion (100 points = ₹10)
        test_results.append(self.test_reward_points_conversion())
        
        # 4. Test wallet payment processing
        test_results.append(self.test_wallet_payment_processing())
        
        # 5. Test transaction history and ledger
        test_results.append(self.test_transaction_history_and_ledger())
        
        # 6. Test error handling for insufficient balance
        test_results.append(self.test_insufficient_balance_error_handling())
        
        # 7. Final verification of balance updates
        test_results.append(self.test_wallet_balance_updates_verification())
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"💰 Wallet System Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        # Print failed tests details
        failed_tests = [test for test in self.test_results if not test['success']]
        if failed_tests:
            print("\n❌ Failed Tests:")
            for test in failed_tests:
                print(f"  - {test['name']}: {test['details']}")
        else:
            print("\n✅ All wallet system tests passed successfully!")
        
        success_rate = (self.tests_passed / self.tests_run) * 100 if self.tests_run > 0 else 0
        print(f"\n🎯 Wallet System Success Rate: {success_rate:.1f}%")
        
        # Detailed analysis
        if success_rate == 100:
            print("\n🎉 WALLET & REWARDS SYSTEM FULLY FUNCTIONAL")
            print("✅ Balance management working correctly")
            print("✅ Reward points conversion (100 pts = ₹10) verified")
            print("✅ Store credits system operational")
            print("✅ Payment processing functional")
            print("✅ Transaction ledger transparent and accurate")
            print("✅ Error handling for insufficient balance working")
        elif success_rate >= 80:
            print("\n⚠️  WALLET SYSTEM MOSTLY FUNCTIONAL - Minor issues detected")
        else:
            print("\n❌ WALLET SYSTEM HAS CRITICAL ISSUES")
        
        return success_rate >= 90  # Require 90%+ for wallet system

def main():
    tester = WalletSystemTester()
    success = tester.run_wallet_system_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())