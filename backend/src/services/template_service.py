from sqlalchemy.orm import Session
from typing import List, Optional
from src.models.template import Template
from src.schemas.template import TemplateCreate, TemplateUpdate

class TemplateService:
    @staticmethod
    def get_all(db: Session) -> List[Template]:
        return db.query(Template).order_by(Template.id.desc()).all()

    @staticmethod
    def get_by_id(db: Session, template_id: int) -> Optional[Template]:
        return db.query(Template).filter(Template.id == template_id).first()

    @staticmethod
    def create(db: Session, data: TemplateCreate) -> Template:
        db_template = Template(**data.model_dump())
        db.add(db_template)
        db.commit()
        db.refresh(db_template)
        return db_template

    @staticmethod
    def update(db: Session, template_id: int, data: TemplateUpdate) -> Optional[Template]:
        db_template = db.query(Template).filter(Template.id == template_id).first()
        if not db_template:
            return None
        
        update_data = data.model_dump(exclude_unset=True)
        for field, val in update_data.items():
            setattr(db_template, field, val)

        db.commit()
        db.refresh(db_template)
        return db_template

    @staticmethod
    def delete(db: Session, template_id: int) -> bool:
        db_template = db.query(Template).filter(Template.id == template_id).first()
        if not db_template:
            return False
        db.delete(db_template)
        db.commit()
        return True
