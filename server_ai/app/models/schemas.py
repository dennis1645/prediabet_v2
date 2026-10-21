from typing import List, Dict, Any, Optional, Union
from pydantic import BaseModel, Field

class UserClinicalContext(BaseModel):
    """Konteks profil medis unik dan terisolasi milik seorang pengguna."""
    userId: Union[int, str]
    username: str
    nama: Optional[str] = "Budi Santoso"
    usia: int = 50
    jenis_kelamin: str = "Laki-laki"
    tinggi_badan: Optional[Union[float, int]] = 172
    berat_badan: Optional[Union[float, int]] = 78
    lingkar_pinggang: Optional[Union[float, int]] = 94
    aktivitas: Optional[str] = "sedang"
    bmi: float = 26.4
    kategori_bmi: str = "Obesitas"
    skor_risiko: int = 75
    kategori_risiko: str = "Prediabetes (IFG)"
    gula_darah_puasa: Optional[Union[float, str]] = "114"
    hba1c: Optional[Union[float, str]] = "5.8"
    pantangan_alergi: List[str] = Field(default_factory=list)
    komorbiditas: Union[List[str], str] = Field(default_factory=list)
    active_diet: str = "Diet Mediterania"
    target_kalori: int = 1996
    target_karbo: Optional[int] = 225
    target_protein: Optional[int] = 125
    target_lemak: Optional[int] = 67
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
