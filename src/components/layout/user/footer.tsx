import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-gray-300 py-6 mt-auto shadow-inner">
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
        
        {/* Información de contacto */}
        <div className="space-y-1 text-center md:text-left">
          <p> barucramirez0617@gmail.com</p>
          <p>📞 +52 465 130 4889</p>
        </div>

       

        {/* Derechos de autor */}
        <div className="text-center md:text-right text-xs text-gray-500">
          © {new Date().getFullYear()} Sistema Educativo. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
