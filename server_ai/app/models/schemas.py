from typing import List, Dict, Any, Optional, Union
from pydantic import BaseModel, Field

class UserClinicalContext(BaseModel):
    """Konteks profil medis unik dan terisolasi milik seorang pengguna."""
    userId: Union[int, str]
    username: str
    nama: Optional[str] = None
    has_profile: Optional[bool] = True
    usia: Optional[Union[int, float]] = None
    jenis_kelamin: Optional[str] = "Laki-laki"
    tinggi_badan: Optional[Union[float, int]] = None
    berat_badan: Optional[Union[float, int]] = None
    lingkar_pinggang: Optional[Union[float, int]] = None
    aktivitas: Optional[str] = "sedang"
    bmi: Optional[Union[float, str]] = None
    kategori_bmi: Optional[str] = None
    skor_risiko: Optional[Union[int, float]] = None
    kategori_risiko: Optional[str] = None
    gula_darah_puasa: Optional[Union[float, str]] = None
    hba1c: Optional[Union[float, str]] = None
    pantangan_alergi: List[str] = Field(default_factory=list)
    komorbiditas: Union[List[str], str] = Field(default_factory=list)
    active_diet: Optional[str] = "Diet Seimbang Ramah Glukosa"
    target_kalori: Optional[Union[int, float]] = 1900
    target_karbo: Optional[int] = 225
    target_protein: Optional[int] = 100
    target_lemak: Optional[int] = 60
    pola_waktu_makan: Optional[str] = "3 kali makan utama + 2 kali selingan"

    class Config:
        extra = "allow"

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
