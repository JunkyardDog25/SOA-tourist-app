from typing import Optional

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class _CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )


class RecordExecutionStartRequest(_CamelModel):
    saga_id: str
    execution_id: str
    tourist_id: str
    tour_id: str


class RecordExecutionCompleteRequest(_CamelModel):
    saga_id: str
    execution_id: str
    tourist_id: str
    tour_id: str


class ExecutionRecordResponse(_CamelModel):
    id: str
    saga_id: str
    execution_id: str
    tourist_id: str
    tour_id: str
    status: str


class ExecutionSagaLogResponse(_CamelModel):
    saga_id: str
    saga_type: str
    status: str
    execution_id: Optional[str] = None
    failed_step: Optional[str] = None
    error_message: Optional[str] = None
