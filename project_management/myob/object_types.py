from graphene import ObjectType, String, Decimal, Int

class BasicForeignKeyObject(ObjectType):
    UID = String(),
    Name = String(),
    DisplayID = String(),
    URI = String()

class ForeignCurrencyObject():
    UID = String()
    Code = String()
    Name = String()
    URI = String()

class InvoicesObject():
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

