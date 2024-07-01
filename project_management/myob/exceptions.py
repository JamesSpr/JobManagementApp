
class MYOBError(BaseException):
    default_message = None

    def __init__(self, message=None):
        if message is None:
            message = self.default_message

        return super().__init__(message)