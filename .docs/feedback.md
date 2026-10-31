# **Kunda Healthcare Management System**

## **Client Feedback & Developer Implementation Requirements**

### **1\. Project Objective**

Implement the improvements requested by Kunda Healthcare following the client feedback meeting.

The changes focus on:

* Improving inventory management by separating medical stock from capital assets.  
* Refining administrative settings and user experience.  
* Introducing configurable common medical test types.  
* Strengthening role-based access control.  
* Restricting sensitive financial analytics.  
* Introducing system-wide audit tracking.

**Important:** Inspect the existing implementation before making changes. Extend existing functionality where appropriate, preserve historical data, and avoid introducing duplicate modules or unnecessary architectural changes.

---

# **2\. Login & User Experience**

### **2.1 Password visibility toggle**

Add a password visibility control to the login screen.

Requirements:

* Add an eye icon to reveal or hide the entered password.  
* Passwords must remain hidden by default.  
* Allow users to toggle visibility without losing the password they have entered.  
* Maintain the existing login functionality.

---

# **3\. Inventory Management — Separate Stock Types**

### **3.1 Introduce separate inventory categories/modules**

The current inventory approach needs to distinguish between two fundamentally different types of items:

1. Medical stock — consumables and medical-related inventory requiring close monitoring.  
2. Capital items — durable assets such as computers, laptops, televisions, chairs, and other equipment.

These should be managed as separate inventory types with dedicated interfaces, forms, categories, and management workflows.

**Implementation requirement:**

Introduce a dedicated inventory interface with tabs that allow authorized users to switch between:

* Medical Stock  
* Capital Items

Each tab must load its own relevant categories, forms, records, and management functionality.

Do not treat capital items as ordinary medical stock with optional fields. They should be a distinct inventory module or clearly separated inventory domain.

### **3.2 Medical Stock**

Medical stock should retain the existing inventory management functionality.

Requirements:

* Maintain existing stock registration and management workflows.  
* Provide relevant fields for medical inventory.  
* Retain applicable pricing and quantity information.  
* Maintain stock-level monitoring and low-stock warnings.  
* Support inventory adjustments and existing stock-related workflows.  
* Improve existing stock registration forms by adding any missing relevant fields identified during codebase inspection.

Stock warnings should apply to medical inventory where stock levels require monitoring.

### **3.3 Capital Items Management**

Create a dedicated module for managing capital items and durable equipment.

Examples:

* Computers and laptops.  
* Televisions.  
* Office chairs and furniture.  
* Printers and other office equipment.  
* Medical equipment and other durable assets.

Requirements:

* Provide dedicated capital item registration forms.  
* Allow administrators to create and manage capital item categories.  
* Support adding, editing, viewing, and managing capital item records.  
* Keep capital item records completely separate from medical stock records.  
* Do not apply medical stock pricing workflows or low-stock warnings to capital items.  
* Do not require stock-level thresholds or minimum-stock warning configurations for capital items.  
* Avoid displaying irrelevant medical inventory fields in capital item forms.  
* Ensure capital item management does not interfere with medical stock calculations, reporting, or warnings.

The capital items module should focus on recording and managing durable assets rather than monitoring consumable inventory.

### **3.4 Inventory Interface and Navigation**

Use a tab-based interface to distinguish the two stock types.

Each tab should have its own:

* Item listing.  
* Categories.  
* Registration and editing forms.  
* Relevant actions.  
* Data handling and validation rules.

Switching tabs should display the appropriate inventory experience without mixing records from the two inventory types.

Preserve existing medical inventory data during implementation.

---

# **4\. Intelligent Medical Stock Warnings**

Improve the existing stock warning functionality.

Requirements:

* Identify medical stock approaching its configured minimum stock level.  
* Generate low-stock warnings when thresholds are reached.  
* Ensure warnings are based on actual inventory quantities.  
* Avoid duplicate or unnecessary alerts.  
* Make items requiring restocking easy to identify.  
* Ensure stock warnings are not generated for capital items.

The warning system must respect the distinction between medical stock and capital items.

---

# **5\. Settings & Insurance Configuration**

### **5.1 Fix the insurance input issue**

There is a bug in the administrative settings interface involving the insurance field.

**Current behaviour:**

* The insurance field automatically inserts an unexpected, unsupported input.  
* This unwanted input blocks the administrator from saving settings.  
* The administrator must manually cancel or remove the unexpected input before saving.

**Required behaviour:**

* Investigate the source of the automatically inserted input.  
* Identify whether it originates from the frontend component, form state management, validation logic, or another integration.  
* Prevent the unsupported input from being automatically inserted.  
* Ensure the insurance field only accepts valid, supported values.  
* Allow administrators to save settings without having to manually cancel unwanted inputs.  
* Verify that saved insurance settings persist correctly after refreshing or reopening the application.

Do not implement a workaround that merely hides the unwanted input. Fix the underlying cause.

---

# **6\. Common Medical Tests Configuration**

### **6.1 Configurable common test types**

Introduce the ability to configure commonly performed medical test types.

The purpose is to improve the user experience by allowing commonly used tests to be readily available for selection instead of requiring users to repeatedly enter test names manually.

Requirements:

* Allow Administrators and Super Users to add common test types.  
* Allow authorized users to view and select configured test types in the relevant clinical workflow.  
* Ensure newly added test types become available wherever the common test selection is required.  
* Prevent unauthorized users from managing the test type configuration.  
* Validate test names and prevent unnecessary duplicate entries.  
* Follow the existing clinical and laboratory workflow.

The feature should focus on managing a configurable list of common test types. Do not introduce an unnecessarily complex laboratory management module or invent additional clinical workflows.

---

# **7\. Financial Management & Revenue Analytics Permissions**

### **7.1 Restrict revenue analytics to Super Users**

Revenue analytics must be accessible exclusively to the Super User.

Examples of restricted information include:

* Amount sold today.  
* Daily revenue totals.  
* Weekly revenue totals.  
* Monthly revenue totals.  
* Overall sales and revenue summaries.  
* Revenue analytics dashboards and visualizations.  
* Other aggregated financial performance indicators.

**Access rules:**

| User role | Revenue analytics access |
| ----- | ----- |
| Super User | Full access |
| System Administrator | No access |
| Doctor | No access |
| Other users | No access |

### **7.2 Implementation requirements**

* Remove or hide revenue analytics from unauthorized users.  
* Ensure revenue analytics widgets are not displayed on unauthorized dashboards.  
* Restrict access to revenue analytics pages and endpoints.  
* Enforce authorization on the backend/API, not just the frontend.  
* Prevent unauthorized access through direct URLs or API requests.  
* Preserve legitimate non-financial functionality for doctors and other users.

**Important distinction:** This restriction concerns revenue analytics and aggregated financial information. Do not automatically disable unrelated operational functions such as recording transactions or performing other authorized clinical and administrative activities.

---

# **8\. User Roles & Permissions**

Introduce a clearer administrative hierarchy and strengthen existing permission enforcement.

### **8.1 Super User**

The Super User has the highest level of system privileges.

Responsibilities and permissions:

* Access to revenue analytics and financial performance information.  
* Access to reports and analytics.  
* Access to system administration functions.  
* Ability to add and manage common medical test types.  
* Ability to perform sensitive deletion operations.  
* Ability to manage protected system resources.

### **8.2 System Administrator**

The System Administrator should have administrative privileges for normal system configuration and management.

Responsibilities and permissions:

* Manage relevant system settings.  
* Manage authorized operational configurations.  
* Add and manage common medical test types.  
* Perform other administrative activities according to assigned permissions.

Restrictions:

* Cannot access revenue analytics.  
* Cannot perform operations reserved exclusively for the Super User.  
* Cannot delete protected assets or documents where Super User privileges are required.

### **8.3 Sensitive deletion permissions**

Restrict the following operations to the Super User:

* Deleting system records and protected data.  
* Deleting assets.  
* Deleting documents.  
* Other sensitive deletion operations.

### **8.4 General permission enforcement**

* Review the existing roles and permissions before implementation.  
* Map existing roles against the updated permission hierarchy.  
* Ensure permissions are enforced consistently across all modules.  
* Protect restricted actions at the backend/API level.  
* Avoid breaking existing clinical, pharmacy, inventory, and operational workflows.  
* Ensure unauthorized users cannot bypass restrictions through direct requests.

---

# **9\. Audit Module**

### **9.1 Introduce system-wide audit tracking**

Add a dedicated Audit Module to record important activities performed within the application.

The purpose is to improve accountability, traceability, and monitoring of user activities.

The audit module should capture relevant events, including:

**User activities**

* User logins and authentication-related events.  
* Relevant user account changes.  
* Administrative actions.

**Data operations**

* Record creation.  
* Record modification.  
* Record deletion.

**Inventory operations**

* Stock adjustments.  
* Medical stock creation and modification.  
* Capital item creation and modification.  
* Other important inventory activities.

**Financial operations**

* Relevant financial transactions and changes.  
* Revenue-related administrative activities.

**System administration**

* Changes to user roles and permissions.  
* Changes to system settings.  
* Changes to common test configurations.  
* Other sensitive administrative actions.

### **9.2 Audit record information**

Where applicable, each audit entry should capture:

* User who performed the action.  
* Action performed.  
* Affected module.  
* Affected record.  
* Date and time.  
* Previous values.  
* Updated values.  
* Relevant contextual information.

### **9.3 Audit security**

* Audit records must be protected from unauthorized modification and deletion.  
* Ordinary users must not be able to manipulate audit history.  
* Ensure audit logging does not expose sensitive information such as passwords or authentication secrets.  
* Provide appropriate filtering and searching capabilities for authorized administrators.

---

# **10\. Acceptance Criteria**

The implementation will be considered complete when the following requirements are satisfied.

### **Login and settings**

* Login supports password visibility toggling.  
* Insurance settings no longer generate unexpected unsupported inputs.  
* Administrators can save insurance settings without manually cancelling unwanted inputs.  
* Insurance settings persist correctly.

### **Inventory**

* Medical Stock and Capital Items are separated into distinct inventory experiences.  
* Users can switch between the two using tabs.  
* Medical stock retains relevant pricing, quantity, and stock monitoring functionality.  
* Capital items have dedicated registration and management forms.  
* Capital item categories can be managed independently.  
* Capital items do not receive medical stock warnings.  
* Capital items do not require medical stock-level thresholds.  
* Existing medical inventory records remain intact.

### **Stock warnings**

* Intelligent low-stock warnings work for medical stock.  
* Warnings respect configured thresholds.  
* Capital items are excluded from medical stock warnings.

### **Common medical tests**

* Administrators can add common test types.  
* Super Users can add common test types.  
* Configured tests are available for selection in relevant clinical workflows.  
* Unauthorized users cannot manage test configurations.

### **Revenue and permissions**

* Revenue analytics are accessible only to the Super User.  
* System Administrators cannot access revenue analytics.  
* Doctors cannot access revenue analytics.  
* Other users cannot access revenue analytics.  
* Restrictions are enforced at the backend/API level.  
* Sensitive deletion operations are restricted to the Super User.

### **Audit**

* Audit module is available.  
* Relevant user activities are recorded.  
* Important data changes are traceable.  
* Inventory and administrative activities are recorded.  
* Audit history is protected from unauthorized manipulation.

---

# **11\. Implementation Instructions for the AI Coding Assistant**

Before implementation:

1. Inspect the existing codebase, database schema, inventory module, authentication system, user roles, settings, and clinical workflows.  
2. Identify existing components and services that can be reused.  
3. Understand how the current medical stock registration, stock-level calculations, and warning mechanisms work.  
4. Identify the source of the unwanted insurance input.  
5. Review the existing revenue analytics implementation and all associated API endpoints.  
6. Map the existing permission system against the updated role requirements.

### **Recommended implementation order**

**Phase 1 — Settings and login**

* Password visibility toggle.  
* Fix insurance input bug.

**Phase 2 — Inventory separation**

* Introduce Medical Stock and Capital Items tabs.  
* Implement dedicated capital item categories and forms.  
* Ensure capital items are excluded from medical stock warnings.  
* Improve medical stock forms.

**Phase 3 — Inventory intelligence**

* Improve medical stock warning functionality.

**Phase 4 — User roles and financial permissions**

* Implement Super User and System Administrator permissions.  
* Restrict revenue analytics.  
* Restrict sensitive deletion operations.

**Phase 5 — Clinical configuration**

* Introduce configurable common medical test types.

**Phase 6 — Audit**

* Implement audit logging and the audit management interface.

### **Development rules**

* Implement incrementally rather than modifying multiple unrelated modules simultaneously.  
* Preserve existing data and functionality.  
* Do not duplicate existing modules or database structures unnecessarily.  
* Apply appropriate backend validation and authorization.  
* Use database migrations where schema changes are necessary.  
* Ensure inventory type separation is reflected in the underlying data model, not just the frontend tabs.  
* Test role permissions using accounts with different access levels.  
* Test existing workflows after every significant change.  
* Do not invent business rules where clarification is required.

The objective is to deliver a reliable enhancement to the existing Kunda Healthcare system without disrupting its current operations.