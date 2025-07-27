from pydantic import BaseModel

class Token(BaseModel):
    access_token: str
    token_type: str

# CORRECTED CLASS
class TokenData(BaseModel):
    sub: str | None = None