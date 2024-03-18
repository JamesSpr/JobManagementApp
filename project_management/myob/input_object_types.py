from graphene import InputObjectType, String, Float, Decimal, Int, DateTime, List, Boolean

# CustomerPayment
# Supplier


class BasicForeignKeyInputObject(InputObjectType):
    UID = String(),
    Name = String(),
    DisplayID = String(),
    URI = String()

class ForeignCurrencyInputObject(InputObjectType):
    UID = String()
    Code = String()
    Name = String()
    URI = String()

class TaxCodeInputObject(InputObjectType):
    UID = String()
    Code = String()
    URI = String()

class InvoicesInputObject(InputObjectType):
    RowID = Int()
    Number = String()
    UID = String()
    AmountApplied = Decimal()
    AmountAppliedForeign = Decimal()
    Type = String()
    URI = String()

class CustomerPaymentInputObject(InputObjectType):
    UID = String()
    DepositTo = String()
    Account = BasicForeignKeyInputObject()
    Customer = BasicForeignKeyInputObject()
    ReceiptNumber = String()
    Date = String()
    AmountReceived = Decimal()
    AmountReceivedForeign = Decimal()
    PaymentMethod = String()
    Memo = String()
    Invoices = InvoicesInputObject(),   
    TransactionID = String()
    ForeignCurrency = ForeignCurrencyInputObject()
    CurrencyExchangeRate = Decimal()
    URI = String()
    RowVersion = String()

class AddressInputObject(InputObjectType):
    Location = Int()
    Street = String()
    City = String()
    State = String()
    PostCode = String()
    Country = String()
    Phone1 = String()
    Phone2 = String()
    Phone3 = String()
    Fax = String()
    Email = String()
    Website = String()
    ContactName = String()
    Salutation = String()

class CreditInputObject(InputObjectType):
    Limit = Decimal()
    Available = Decimal()
    PastDue = Decimal()

class ARIdentifierInputObject(InputObjectType):
    Label = String()
    Value = String()

class TermsInputObject(InputObjectType):
    PaymentIsDue = String()
    DiscountDate = Int()
    BalanceDueDate = Int()
    DiscountForEarlyPayment = Float()
    VolumeDiscount = Float()

class RefundInputObject(InputObjectType):
    PaymentMethod = String()
    CardNumber = String()
    NameOnCard = String()
    Notes = String()

class BuyingDetailsInputObject(InputObjectType):
    PurchaseLayout = String()
    PrintedForm = String()
    PurchaseOrderDelivery = String()
    ExpenseAccount = BasicForeignKeyInputObject()
    PaymentMemo = String()
    PurchaseComment = String()
    SupplierBillingRate = Decimal()
    ShippingMethod = String()
    IsReportable = Boolean()
    CostPerHour = Decimal()
    Credit = CreditInputObject()
    ABN = String()
    ABNBranch = String()
    TaxIdNumber = String()
    TaxCode = TaxCodeInputObject()
    FreightTaxCode = TaxCodeInputObject()
    UseSupplierTaxCode = Boolean()
    Terms = TermsInputObject()

class PaymentDetailsInputObject(InputObjectType):
    BSBNumber = String()
    BankAccountNumber = String()
    BankAccountName = String()
    StatementText = String()
    StatementCode = String()
    StatementReference = String()
    Refund = RefundInputObject()

class SupplierInputObject(InputObjectType):
    UID = String()
    CompanyName = String()
    LastName = String()
    FirstName = String()
    IsIndividual = Boolean()
    DisplayID = String()
    IsActive = Boolean()
    Addresses = List(AddressInputObject)
    Notes = String()
    Identifiers = List(ARIdentifierInputObject)
    CustomList1 = ARIdentifierInputObject()
    CustomList2 = ARIdentifierInputObject()
    CustomList3 = ARIdentifierInputObject()
    CustomField1 = ARIdentifierInputObject()
    CustomField2 = ARIdentifierInputObject()
    CustomField3 = ARIdentifierInputObject()
    CurrentBalance = Decimal()
    BuyingDetails = BuyingDetailsInputObject()
    PaymentDetails = PaymentDetailsInputObject()
    ForeignCurrency = ForeignCurrencyInputObject()
    LastModifiedDateTime = DateTime()
    PhotoURI = String()
    URI = String()
    RowVersion = String()