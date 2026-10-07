export const TOAST_MESSAGES = {
  SIGN_IN_REQUIRED: {
    title: "Por favor, inicia sesión",
    variant: "destructive" as const,
  },
  HEART_SIGN_IN: {
    description: "Necesitas iniciar sesión para marcar libros como favoritos.",
  },
  BORROW_SIGN_IN: {
    description: "Necesitas iniciar sesión para solicitar préstamos de libros.",
  },
  REQUEST_SUBMITTED: {
    title: "Solicitud enviada",
    description: "Tu solicitud de préstamo ha sido enviada para revisión.",
  },
} as const;
