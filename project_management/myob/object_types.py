from graphene import ObjectType, String, Float, Decimal, Int, DateTime, List, Boolean

# CustomerPayment
# Supplier


class BasicForeignKeyObject(ObjectType):
    UID = String(),
    Name = String(),
    DisplayID = String(),
    URI = String()

class ForeignCurrencyObject(ObjectType):
    UID = String()
    Code = String()
    Name = String()
    URI = String()

class TaxCodeObject(ObjectType):
    UID = String()
    Code = String()
    URI = String()

class InvoicesObject(ObjectType):
    RowID = Int(),
    Number = String(),
    UID = String(),
    AmountApplied = Decimal(),
    AmountAppliedForeign = Decimal(),
    Type = String(),
    URI = String()

class CustomerPaymentObject(ObjectType):
    UID = String(),
    DepositTo = String(),
    Account = BasicForeignKeyObject(),
    Customer = BasicForeignKeyObject(),
    ReceiptNumber = String(),
    Date = String(),
    AmountReceived = Decimal(),
    AmountReceivedForeign = Decimal(),
    PaymentMethod = String(),
    Memo = String(),
    Invoices = InvoicesObject(),    
    TransactionID = String(),
    ForeignCurrency = ForeignCurrencyObject(),
    CurrencyExchangeRate = Decimal(),
    URI = String(),
    RowVersion = String()

class AddressObject(ObjectType):
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

class CreditObject(ObjectType):
    Limit = Decimal()
    Available = Decimal()
    PastDue = Decimal()

class ARIdentifierObject(ObjectType):
    Label = String()
    Value = String()

class TermsObject(ObjectType):
    PaymentIsDue = String()
    DiscountDate = Int()
    BalanceDueDate = Int()
    DiscountForEarlyPayment = Float()
    VolumeDiscount = Float()

class RefundObject(ObjectType):
    PaymentMethod = String()
    CardNumber = String()
    NameOnCard = String()
    Notes = String()

class BuyingDetailsObject(ObjectType):
    PurchaseLayout = String()
    PrintedForm = String()
    PurchaseOrderDelivery = String()
    ExpenseAccount = BasicForeignKeyObject()
    PaymentMemo = String()
    PurchaseComment = String()
    SupplierBillingRate = Decimal()
    ShippingMethod = String()
    IsReportable = Boolean()
    CostPerHour = Decimal()
    Credit = CreditObject()
    ABN = String()
    ABNBranch = String()
    TaxIdNumber = String()
    TaxCode = TaxCodeObject()
    FreightTaxCode = TaxCodeObject()
    UseSupplierTaxCode = Boolean()
    Terms = TermsObject()

class PaymentDetailsObject(ObjectType):
    BSBNumber = String()
    BankAccountNumber = String()
    BankAccountName = String()
    StatementText = String()
    StatementCode = String()
    StatementReference = String()
    Refund = RefundObject()

class SupplierObject(ObjectType):
    UID = String()
    CompanyName = String()
    LastName = String()
    FirstName = String()
    IsIndividual = Boolean()
    DisplayID = String()
    IsActive = Boolean()
    Addresses = List(AddressObject)
    Notes = String()
    Identifiers = List(ARIdentifierObject)
    CustomList1 = ARIdentifierObject()
    CustomList2 = ARIdentifierObject()
    CustomList3 = ARIdentifierObject()
    CustomField1 = ARIdentifierObject()
    CustomField2 = ARIdentifierObject()
    CustomField3 = ARIdentifierObject()
    CurrentBalance = Decimal()
    BuyingDetails = BuyingDetailsObject()
    PaymentDetails = PaymentDetailsObject()
    ForeignCurrency = ForeignCurrencyObject()
    LastModifiedDateTime = DateTime()
    PhotoURI = String()
    URI = String()
    RowVersion = String()