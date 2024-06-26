from graphene import ObjectType, String, Float, Decimal, Int, DateTime, List, Boolean

# CustomerPayment
# Supplier


class BasicForeignKeyObject(ObjectType):
    UID = String()
    Code = String()
    URI = String()

class DisplayIDForeignKeyObject(ObjectType):
    UID = String(),
    Name = String(),
    DisplayID = String(),
    URI = String()

class NameForeignKeyObject(ObjectType):
    UID = String()
    Code = String()
    Name = String()
    URI = String()

class CurrencyForeignKeyObject(ObjectType):
    UID = String()
    Code = String()
    CurrencyName = String()
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
    Account = DisplayIDForeignKeyObject(),
    Customer = DisplayIDForeignKeyObject(),
    ReceiptNumber = String(),
    Date = String(),
    AmountReceived = Decimal(),
    AmountReceivedForeign = Decimal(),
    PaymentMethod = String(),
    Memo = String(),
    Invoices = InvoicesObject(),    
    TransactionID = String(),
    ForeignCurrency = NameForeignKeyObject(),
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
    ExpenseAccount = DisplayIDForeignKeyObject()
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
    TaxCode = BasicForeignKeyObject()
    FreightTaxCode = BasicForeignKeyObject()
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
    ForeignCurrency = NameForeignKeyObject()
    LastModifiedDateTime = DateTime()
    PhotoURI = String()
    URI = String()
    RowVersion = String()


class SaleTermsObject(ObjectType):
    PaymentIsDue = String()
    DiscountDate = Int()
    BalanceDueDate = Int()
    DiscountForEarlyPayment = Decimal()
    MonthlyChargeForLatePayment = Decimal()
    DiscountExpiryDate = DateTime()
    Discount = Decimal()
    DiscountForeign = Decimal()
    DueDate = DateTime()
    FinanceCharge = Decimal()
    FinanceChargeForeign = Decimal()

class SaleLinesObject(ObjectType):
    RowID = Int()
    Type = String()
    Description = String()
    UnitsOfMeasure = String()
    UnitCount = Decimal()
    UnitPrice = Decimal()
    UnitPriceForeign = Decimal()
    DiscountPercent = Decimal()
    Total = Decimal()
    TotalForeign = Decimal()
    Account = DisplayIDForeignKeyObject()
    Job = NameForeignKeyObject()
    TaxCode = BasicForeignKeyObject()
    RowVersion = String()

class SaleInvoiceObject(ObjectType):
    UID = String()
    Number = String()
    Date = DateTime()
    CustomerPurchaseOrderNumber = String()
    Customer = DisplayIDForeignKeyObject()
    PromisedDate = DateTime()
    BalanceDueAmount = Decimal()
    BalanceDueAmountForeign = Decimal()
    Status = String()
    Lines = List(SaleLinesObject)
    ShipToAddress = String()
    Terms = SaleTermsObject()
    IsTaxInclusive = Boolean()
    Subtotal = Decimal()
    SubtotalForeign = Decimal()
    Freight = Decimal()
    FreightForeign = Decimal()
    FreightTaxCode = BasicForeignKeyObject()
    TotalTax = Decimal()
    TotalTaxForeign = Decimal()
    TotalAmount = Decimal()
    TotalAmountForeign = Decimal()
    Category = DisplayIDForeignKeyObject()
    Salesperson = DisplayIDForeignKeyObject()
    Comment = String()
    ShippingMethod = String()
    JournalMemo = String()
    ReferralSource = String()
    InvoiceDeliveryStatus = String()
    LastPaymentDate = DateTime()
    CanApplySurcharge = Boolean()
    Order = BasicForeignKeyObject()
    OnlinePaymentMethod = String()
    ForeignCurrency = CurrencyForeignKeyObject()
    CurrencyExchangeRate = Decimal()
    LastModified = DateTime()
    URI = String()
    RowVersion = String()

class SaleOrderObject(ObjectType):
    UID = String()
    Number = String()
    Date = DateTime()
    ShipToAddress = String()
    CustomerPurchaseOrderNumber = String()
    Customer = DisplayIDForeignKeyObject()
    Terms = SaleTermsObject()
    IsTaxInclusive = Boolean()
    Lines = List(SaleLinesObject)
    Subtotal = Decimal()
    SubtotalForeign = Decimal()
    Freight = Decimal()
    FreightForeign = Decimal()
    FreightTaxCode = BasicForeignKeyObject()
    TotalTax = Decimal()
    TotalTaxForeign = Decimal()
    TotalAmount = Decimal()
    TotalAmountForeign = Decimal()
    Category = DisplayIDForeignKeyObject
    Salesperson = DisplayIDForeignKeyObject()
    Comment = String()
    ShippingMethod = String()
    JournalMemo = String()
    PromisedDate = DateTime()
    DeliveryStatus = String()
    ReferralSource = String()
    AppliedToDate = Decimal()
    AppliedToDateForeign = Decimal()
    BalanceDueAmount = Decimal()
    BalanceDueAmountForeign = Decimal()
    Status = String()
    LastPaymentDate = DateTime()
    ForeignCurrency = CurrencyForeignKeyObject()
    LastModified = DateTime()
    CurrencyExchangeRate = Decimal()
    URI = String()
    RowVersion = String()