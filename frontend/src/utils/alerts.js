import Swal from "sweetalert2";

// PrediaBeat custom-styled SweetAlert2 helpers
export const showSuccessAlert = (title, text) => {
  return Swal.fire({
    title,
    text,
    icon: "success",
    confirmButtonColor: "#059669",
    confirmButtonText: "Lanjutkan",
    customClass: {
      popup: "rounded-3xl shadow-2xl font-sans",
      confirmButton: "rounded-xl font-bold px-6 py-2.5",
    },
  });
};

export const showErrorAlert = (title, text) => {
  return Swal.fire({
    title: title || "Gagal",
    text: text || "Terjadi kesalahan.",
    icon: "error",
    confirmButtonColor: "#e11d48",
    confirmButtonText: "Tutup",
    customClass: {
      popup: "rounded-3xl shadow-2xl font-sans",
      confirmButton: "rounded-xl font-bold px-6 py-2.5",
    },
  });
};

export const showToast = (arg1, arg2 = "success") => {
  const validIcons = ["success", "error", "warning", "info", "question"];
  let icon = "info";
  let title = "";

  if (validIcons.includes(arg1)) {
    icon = arg1;
    title = arg2;
  } else if (validIcons.includes(arg2)) {
    title = arg1;
    icon = arg2;
  } else {
    title = arg1;
    icon = "info";
  }

  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    },
    customClass: {
      popup: "rounded-2xl shadow-xl font-sans text-sm",
    },
  });

  return Toast.fire({
    icon,
    title,
  });
};

export default Swal;
