# JobManagementApp
Construction Management Web Application

## Stack
[Python](https://www.python.org/)
- [Django](https://www.djangoproject.com/)
- [Graphene](https://docs.graphene-python.org/projects/django/en/latest/)
- [Django GraphQL Auth](https://django-graphql-auth.readthedocs.io/en/latest/)
- [Celery](https://docs.celeryq.dev/en/main/getting-started/introduction.html)  

[PostgreSQL](https://www.postgresql.org/)  

JavaScript/[TypeScript](https://www.typescriptlang.org/) 
- [React](https://react.dev/)  
- [Axios](https://axios-http.com/docs/intro)
- [TanStack Table](https://tanstack.com/table/latest)

## Functionality  
### Management
Add and manage aspects of the construction management workflow:
- Company Admin
    - Manage employees and their permissions
    - Add insurances and relevant documentation
- Jobs
    - Manage job through different stages of its lifecycle
    - Create a quotation
    - Provide information to clients through emails
    - Create site safety documents
- Clients
    - Locations
    - Contacts
- Contractors
    - Contacts
    - Banking
- Invoices
    - Client Invoices
    - Subcontractor Bills
    - Remittance Advice
- Analytics and Reporting
    - See cashflow for a given period
    - Generate financial reports

### MYOB Integration
- Utilising [MYOB Business API](https://developer.myob.com/api/myob-business-api/v2/)
- Connects to MYOB using OAuth 2.0 
- Sync all required management aspects with [MYOB](https://www.myob.com/au)

### Document Creation
- Generate Quotations in the form of word documents
- Generate Price Breakdowns and Reports in the form of excel spreadsheets
- Edit PDFs and combine for invoices and bills

### Document Processing
- Read and extract information from PDFs using [Google Tesseract OCR](https://github.com/tesseract-ocr/tesseract) and [Pytesseract](https://github.com/madmaze/pytesseract)
    - Contractor details from bills
    - Invoice details from remittance advice

### Timesheets
- Scheduled tasks to run when required
- Read emails that contain timesheet data
- Process email data into system
- Send details to accounting software for further processing