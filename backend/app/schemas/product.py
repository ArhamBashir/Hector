from pydantic import BaseModel
from ..db.models import ProductType

class ProductBase(BaseModel):
    sku: str
    product_name: str
    target_cost_per_unit: float
    category: str
    product_type: ProductType

class ProductCreate(ProductBase):
    pass

class Product(ProductBase):
    id: int

    class Config:
        from_attributes = True
        
class ProductUpdate(ProductBase):
    pass        