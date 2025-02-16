------------------------------------------------------------
GatherPay Context & Execution Plan for Cursor AI – FINAL
------------------------------------------------------------

INSTRUCTIONS:
-------------
Before proceeding with any file changes or code generation, please do the following:

1. Thoroughly read and analyze the entire blueprint below.
2. Take some time to "think" about every aspect of the project—including user onboarding, wallet management, geolocation, group order formation, integrated chat, order verification, fund management, reward distribution, and security/dispute resolution.
3. Review the Cursor AI rule file (cursor_rules.txt) to ensure that all dependency checks, backup routines, logging, and consistency verifications are applied before making any changes.
4. Verify that all dependencies are present and that any previous file state and history are remembered.
5. Develop a comprehensive plan based on the blueprint below, considering industry-level best practices and ensuring that every module integrates with its dependencies.
6. Only after this thorough review and planning process, begin the creation (coding) process for the application.
7. Remember: All changes must honor the Cursor AI rule file – ensuring dependency checks, backup snapshots, and integrity verifications are performed before any modifications.

------------------------------------------------------------
GatherPay: Group Ordering Simplified – Detailed Blueprint
------------------------------------------------------------

Project Overview:
GatherPay is a mobile application designed to help users overcome minimum order challenges (e.g., the ₹200 minimum for free delivery) on platforms such as Blinkit, Instamart, and Swiggymart. Users can join or create group orders based on their proximity, pool funds from their GatherPay wallet, and collectively place orders. A designated group leader (the one taking responsibility for order placement) handles the external order process and, upon order confirmation, receives reimbursements along with bonus reward coins.

1. User Onboarding & Wallet Setup
-----------------------------------
Sign-Up Process:
• User Registration:
  - Collect basic user details: First Name, Last Name, Email, Phone Number.
  - No email confirmation is needed at sign-up—phone verification is sufficient.

Wallet Creation:
• Automatic Wallet Generation:
  - Upon successful sign-up, create a personal GatherPay wallet for each user in Firebase.
• Collateral Deposit Requirement:
  - Every new user gets a wallet, but depositing a minimum of ₹200 is required to actively join or create group orders.
  - Users with a wallet balance of ₹0 can log in and view nearby groups but cannot join or initiate orders until funds are deposited.
• UI Consideration:
  - Display a clear wallet dashboard with the current balance and prompt users to “Add Funds” if their balance is insufficient.
  - Clearly explain that the collateral helps ensure compliance and reduce fraud.

2. Main Dashboard & Location Detection
----------------------------------------
Account Overview:
• Dashboard Components:
  - Display the GatherPay wallet balance, recent transaction history, and user profile information.
  - Optionally include notifications (e.g., new group order available, order status updates, reward coin accrual).

Geolocation Integration:
• Automatic Location Detection:
  - Use React Native’s Geolocation API (or Expo Location module) to detect the user’s current location after sign-in.
  - Request necessary permissions and display an intuitive prompt for location sharing.
• Location-Based Data:
  - Use the detected latitude and longitude to filter and display nearby groups (e.g., within 50m, 100m, etc.) on the dashboard.

Dashboard Options:
• Primary Actions:
  - Create a New Group: A button to initiate a new group order.
  - Join an Existing Group: A list or map view showing groups filtered by proximity.
  - Auto-Display: Nearby groups are automatically visible based on the detected location; however, joining is enabled only if the user’s wallet balance is ≥ ₹200.

3. Group Formation & Communication
-------------------------------------
Group Creation/Joining Flow:
• Creating a Group:
  - User selects “Create New Group.”
  - The app prompts for order details (optional fields such as items, approximate total, etc.) and assigns a unique group ID.
  - The creator becomes the provisional group leader.
• Joining a Group:
  - The user sees a list of nearby groups with details (distance, current number of participants, order total target).
  - The user can tap to view more details and join a group, provided their wallet balance is ≥ ₹200.

Integrated Group Chat:
• Chat Functionality:
  - Use Firebase Cloud Firestore (or Realtime Database) with a chat UI library (e.g., Gifted Chat) for smooth messaging.
  - Each group order has its own chat room where members can discuss order details, coordinate on leader selection, and share images.
• Media Uploads:
  - Leverage Firebase Storage to upload and serve images (e.g., product details, order confirmation screenshots).
  // for now storage is paid so just implement it i havent took storage so keep in mind
  - Store media links in the chat message documents.

Order Coordination & Leadership:
• Group Leader Selection:
  - The group decides (via consensus, predefined criteria, or voting) on a group leader responsible for placing the external order.
  - The leader’s role is clearly marked in the group details.

4. Order Placement & Verification
------------------------------------
Order Process:
• External Order Placement:
  - The designated group leader manually places the consolidated order on the delivery platform (Blinkit/Instamart/Swiggymart) using their personal account.
• Order Confirmation:
  - After placing the order, the group leader uploads a screenshot of the order confirmation in the group chat.
  - The app extracts key details (order amount, items, total) for verification (either manually or using automated logic).

Verification Workflow:
• Confirmation Handling:
  - A Cloud Function (or similar backend process) is triggered upon screenshot upload.
  - Once order details are successfully verified, the system marks the group order as “confirmed.”
• Status Updates:
  - All group members receive an in-app notification indicating that the order has been confirmed.

5. Fund Management, Order Settlement & Reward Distribution
------------------------------------------------------------
Transaction Flow & Order Settlement:
• Payment Deduction:
  - When an order is confirmed, trigger a transaction that debits the required funds from each participating member’s GatherPay wallet.
  - Verify that each wallet meets the collateral requirement (≥ ₹200) before processing.
• Payment Split Calculation:
  - Calculate each member’s contribution using the formula:
       (Individual Product MRP / Total MRP of all products) * (Taxes – Coupons) + Individual Product MRP
  - The calculated split must be approved by each group member within the chat.
  - Once all members approve the split, the funds are debited from their wallets and credited to the group leader’s wallet.
• Post-Order Process:
  - After the necessary transactions are completed and the order is successfully delivered, the group is deleted from the system.
  - Platform fees are then deducted from the users’ wallets as per the predefined fee structure.
• Order Confirmation by Delivery:
  - Group members must confirm that they have met the group leader (or their designated representative) to receive their order.
  - Users can share contact numbers, locations, or join a group call via the in-app chat to facilitate the handover.
  - If a user fails to collect the order within 10 minutes (or does not send someone on their behalf), an additional amount is deducted from their wallet as a penalty.

Reward System:
• Bonus Coins for Group Leader:
  - Upon successful order verification and member approval of the split, the group leader is awarded bonus coins (e.g., 1000 coins).
  - Coins are stored in the wallet and can be converted into rupees or used for in-app benefits.
• Reward Transparency:
  - Display reward coin balances on the wallet dashboard with clear conversion rates and terms.

Collateral & Compliance Enforcement:
• Minimum Deposit Rule:
  - Users without the required collateral (wallet balance of ₹0) can view groups but cannot join until they deposit funds.
  - Reminders prompt users to deposit the minimum amount.
• Fraud Prevention:
  - Terms of service clearly state that misuse or fraudulent behavior may result in forfeiture of the collateral.
  - Audit logs of all wallet transactions are maintained for dispute resolution.

6. Security, Transparency & Dispute Resolution
------------------------------------------------
Security Measures:
• Authentication & Authorization:
  - Use Firebase Authentication for secure sign-up and session management.
• Data Security:
  - Implement Firebase Firestore security rules to restrict access based on user ID and roles.
  - Encrypt data in transit using HTTPS.
• Wallet & Transaction Security:
  - Monitor all transactions with Firebase Cloud Functions to verify integrity before updating wallet balances.

Audit Trail & Transparency:
• Logging:
  - Log every transaction (deposits, debits, reward distributions) in Firestore.
  - A user-accessible transaction history displays dates, amounts, and details.
• Reporting Tools:
  - Provide an “Activity Log” section for users to view a complete history of their actions.

Dispute Management:
• Automated Rules:
  - If order confirmation is not uploaded within a defined time window, automatically trigger a refund process.
• Customer Support Integration:
  - Integrate an in-app support chat or ticketing system (via Firebase or third-party tools) for handling disputes.
• Collateral Utilization:
  - Clearly outline policies for using collateral to cover discrepancies if a user fails to comply with procedures.

7. Technical Stack & Infrastructure
--------------------------------------
Frontend: React Native
• Framework:
  - Develop a cross-platform mobile app using React Native Expo for rapid prototyping.
• Libraries:
  - React Navigation for routing and screen transitions.
  - Gifted Chat (or similar) for group chat functionality.
  - Expo Location or React Native Geolocation API for detecting user location.
• UI/UX:
  - Use custom components styled with libraries like Styled Components or React Native Paper.

Backend & Database: Firebase Platform
• Firebase Authentication:
  - Manage user sign-up, OTP verification, and session management.
• Cloud Firestore (or Firebase Realtime Database):
  - Store user profiles, wallet balances, group details, chat messages, and transaction histories.
• Firebase Storage:
  - Handle media uploads for images (e.g., order confirmation screenshots).
• Firebase Cloud Functions:
  - Process order confirmations, manage wallet transactions (debits/credits), calculate payment splits, distribute rewards, and enforce business logic.
• Firebase Security Rules:
  - Configure to ensure that only authenticated users can access and modify their data and that financial transactions are securely managed.

Additional Integrations:
• Payment Gateway:
  - Integrate with a provider like Razorpay for depositing funds into GatherPay wallets.

• Geolocation API:
  - Utilize React Native’s Geolocation API to detect and filter groups by proximity.

Deployment & Infrastructure:
• Hosting:
  - Use Firebase Hosting for static web content or admin dashboards.
• App Distribution:
  - Deploy the mobile app to the Google Play Store and Apple App Store.
• Monitoring:
  - Use Firebase Analytics, Crashlytics, and Cloud Logging to monitor performance and errors.

8. Development & Budget Considerations
----------------------------------------
• Minimum Viable Product (MVP):
  - Focus on core functionalities: user sign-up with OTP, wallet creation and balance verification, geolocation-based group order display, integrated group chat, order confirmation upload, wallet transaction management, and the new order settlement logic.
  - Leverage Firebase’s free tier during early development to minimize initial costs.
• Scalability & Maintenance:
  - The chosen stack (React Native + Firebase) is scalable and supported by a large community, ensuring low overhead as the project grows.
• Cost Efficiency:
  - Use Firebase’s pay-as-you-go model to keep expenses low in initial phases.
• Timeline:
  - Define development milestones (onboarding, wallet & transaction management, group chat, geolocation filtering, order verification, order settlement with split approval, reward distribution) and adhere to them strictly.

9. Dummy Data for Testing
--------------------------
• Insert 4 dummy user records into the database as test users.
  - Ensure these 4 dummy users are assigned locations approximately 100 meters apart to simulate realistic proximity-based group filtering.

------------------------------------------------------------
FINAL REMINDER:
------------------------------------------------------------
Before starting any code generation or modifications, ensure that Cursor AI loads and applies the dependency and backup rules from the Cursor AI rule file (cursor_rules.txt). Verify that all project dependencies are intact and that the stored dependency graph matches the current state. Only then should you proceed with implementing the code based on this blueprint.

------------------------------------------------------------
END OF CONTEXT FILE
------------------------------------------------------------

Cursor AI, please review this entire blueprint, reflect on every detail, develop a comprehensive plan (considering all dependencies and industry-level best practices), and then proceed with code creation only after verifying that all rules and backups are in place.
