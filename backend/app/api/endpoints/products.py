from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from ... import schemas
from ...db import models
from .. import deps

router = APIRouter()


@router.post("/", response_model=schemas.Product)
def create_master_product(
    *,
    product_in: schemas.ProductCreate,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Create a new master product. Accessible only by admins.
    """
    if current_user.role != models.UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    
    existing_product = db.query(models.MasterProduct).filter(models.MasterProduct.sku == product_in.sku).first()
    if existing_product:
        raise HTTPException(status_code=400, detail="Product with this SKU already exists")

    product = models.MasterProduct(**product_in.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.get("/", response_model=List[schemas.Product])
def read_master_products(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    q: Optional[str] = None,
    category: Optional[str] = None,
    product_type: Optional[str] = None, # <-- THIS LINE IS THE FIX
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Retrieve master products with optional search and filtering. 
    Accessible by admins and sourcers.
    """
    if current_user.role not in [models.UserRole.admin, models.UserRole.sourcer]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    
    query = db.query(models.MasterProduct)

    if q:
        query = query.filter(
            (models.MasterProduct.sku.ilike(f"%{q}%")) |
            (models.MasterProduct.product_name.ilike(f"%{q}%"))
        )
    if category:
        query = query.filter(models.MasterProduct.category.ilike(f"%{category}%"))
    if product_type and product_type in models.ProductType.__members__:
        query = query.filter(models.MasterProduct.product_type == product_type)

    products = query.offset(skip).limit(limit).all()
    return products


@router.put("/{product_id}", response_model=schemas.Product)
def update_master_product(
    *,
    product_id: int,
    product_in: schemas.ProductUpdate,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Update a master product. Accessible only by admins.
    """
    if current_user.role != models.UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    
    product = db.query(models.MasterProduct).filter(models.MasterProduct.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    update_data = product_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(product, field, value)
    
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}", response_model=schemas.Product)
def delete_master_product(
    *,
    product_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Delete a master product. Accessible only by admins.
    """
    if current_user.role != models.UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    
    product = db.query(models.MasterProduct).filter(models.MasterProduct.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    db.delete(product)
    db.commit()
    return product