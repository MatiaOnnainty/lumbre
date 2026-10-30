// Configuración de web-ext: qué NO entra en el paquete firmado.
export default {
  ignoreFiles: ["test", "package.json", "package-lock.json", "README.md", "web-ext-config.mjs", ".env", ".amo-upload-uuid"],
};
