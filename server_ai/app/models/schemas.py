from typing import List, Dict, Any, Optional, Union
from pydantic import BaseModel, Field

class UserClinicalContext(BaseModel):
    """Konteks profil medis unik dan terisolasi milik seorang pengguna."""
    userId: Union[int, str]
    username: str
    usia: int = 40
    jenis_kelamin: str = "Laki-laki"
    bmi: float = 24.5
    kategori_bmi: str = "Normal"
    skor_risiko: int = 50
    kategori_risiko: str = "Sedang"
    gula_darah_puasa: Optional[Union[float, str]] = "Belum ada tes lab"
    hba1c: Optional[Union[float, str]] = "Belum ada tes lab"
    pantangan_alergi: List[str] = Field(default_factory=list)
    komorbiditas: Union[List[str], str] = Field(default_factory=list)
    active_diet: str = "Diet Mediterania"
    target_kalori: int = 1850

class ChatTurn(BaseModel):
    role: str  # "user" | "assistant" | "system"
    content: str
    created_at: Optional[str] = None

class ChatRequest(BaseModel):
    user_id: Optional[Union[int, str]] = None
    message: str
    user_context: Optional[UserClinicalContext] = None
    chat_history: Optional[List[ChatTurn]] = Field(default_factory=list)
    stream: bool = False

class GuardrailReport(BaseModel):
    zero_allergen_verified: bool = True
    allergens_checked: List[str] = Field(default_factory=list)
    allergens_detected_and_blocked: List[str] = Field(default_factory=list)
    deterministic_graph_used: bool = True
    safety_message: str = "100% Bebas Alergen & Aman Secara Klinis"

class ChatResponse(BaseModel):
    success: bool = True
    response: str
    user_id: Union[int, str]
    safe_foods_recommended: List[str] = Field(default_factory=list)
    guardrail: GuardrailReport
    telemetry: Dict[str, Any] = Field(default_factory=dict)
