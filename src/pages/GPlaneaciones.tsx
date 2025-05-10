import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';
import { Copy, Trash2, Send } from 'lucide-react';

const GEMINI_API_KEY = 'AIzaSyCTjNT14x9aDf9bXmvspJM0vCfoiL2IRRI'; // Reemplaza con tu clave real

interface ChatMessage {
  role: string;
  content: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
}

const LessonPlanGenerator: React.FC = () => {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('chatSessions');
    return saved ? JSON.parse(saved) : [{
      id: uuidv4(),
      title: 'Chat 1',
      messages: [{
        role: 'bot',
        content:
          '¡Hola! Soy tu asistente experto en crear planeaciones didácticas para primaria. Por favor indícame los datos de la planeación: grado escolar, materia, tema(s), duración (ejemplo: 1 clase, 1 semana), objetivo(s) del docente, fecha de inicio y fecha de fin.',
      }],
    }];
  });
  const [currentSessionId, setCurrentSessionId] = useState<string>(chatSessions[0].id);
  const [chatInput, setChatInput] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  useEffect(() => {
    localStorage.setItem('chatSessions', JSON.stringify(chatSessions));
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatSessions]);

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMessage: ChatMessage = { role: 'user', content: chatInput };
    setChatSessions((prev) =>
      prev.map((session) =>
        session.id === currentSessionId
          ? { ...session, messages: [...session.messages, newMessage] }
          : session
      )
    );
    setChatInput('');

    const prompt = `
Eres un asistente educativo experto en crear planeaciones didácticas para nivel primaria.  
Necesito que generes una planeación didáctica con los siguientes datos:

${chatInput}

Genera la planeación organizada en este formato:

1. **Objetivo(s) específico(s)**:  
– Listado claro

2. **Actividades sugeridas**:  
– Inicio  
– Desarrollo  
– Cierre

3. **Materiales necesarios**:  
– Lista

4. **Estrategias de evaluación**:  
– Lista de formas para evaluar el aprendizaje

La planeación debe estar pensada para estudiantes de primaria, ser clara, creativa y aplicable al contexto escolar. No inventes datos fuera de los temas proporcionados.  
Genera un texto bien estructurado, organizado y fácil de entender para un maestro.
    `;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response.text();

      setChatSessions((prev) =>
        prev.map((session) =>
          session.id === currentSessionId
            ? { ...session, messages: [...session.messages, { role: 'bot', content: response }] }
            : session
        )
      );
    } catch (error: any) {
      console.error('Error generating lesson plan:', error.message);
      setChatSessions((prev) =>
        prev.map((session) =>
          session.id === currentSessionId
            ? {
                ...session,
                messages: [
                  ...session.messages,
                  { role: 'bot', content: 'Lo siento, hubo un error al generar la planeación. Intenta de nuevo.' },
                ],
              }
            : session
        )
      );
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content)
      .then(() => alert('Texto copiado al portapapeles!'))
      .catch((err) => {
        console.error('Error al copiar:', err);
        alert('Error al copiar el texto.');
      });
  };

  const createNewChat = () => {
    const newSession: ChatSession = {
      id: uuidv4(),
      title: `Chat ${chatSessions.length + 1}`,
      messages: [{
        role: 'bot',
        content:
          '¡Hola! Soy tu asistente experto en crear planeaciones didácticas para primaria. Por favor indícame los datos de la planeación: grado escolar, materia, tema(s), duración (ejemplo: 1 clase, 1 semana), objetivo(s) del docente, fecha de inicio y fecha de fin.',
      }],
    };
    setChatSessions((prev) => [...prev, newSession]);
    setCurrentSessionId(newSession.id);
  };

  const openDeleteModal = (sessionId: string) => {
    setSessionToDelete(sessionId);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setSessionToDelete(null);
  };

  const confirmDeleteChat = () => {
    if (!sessionToDelete) return;

    if (chatSessions.length === 1) {
      alert('No puedes eliminar el único chat existente.');
      closeDeleteModal();
      return;
    }

    const updatedSessions = chatSessions.filter((session) => session.id !== sessionToDelete);
    setChatSessions(updatedSessions);

    if (currentSessionId === sessionToDelete) {
      setCurrentSessionId(updatedSessions[0].id);
    }

    closeDeleteModal();
  };

  const switchChat = (sessionId: string) => {
    setCurrentSessionId(sessionId);
  };

  const currentSession = chatSessions.find((session) => session.id === currentSessionId);

  return (
    <div className="min-h-screen w-screen flex flex-col items-center bg-gradient-to-b from-blue-50 to-gray-100 p-4">
      <div className="w-[80%] max-w-4xl flex flex-col">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-gray-800 text-center">
          Generador de Planeaciones Didácticas
        </h2>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="md:w-1/4 bg-white rounded-lg shadow-lg p-4">
            <button
              onClick={createNewChat}
              className="w-full bg-blue-600 text-white py-2 rounded-full hover:bg-blue-700 mb-4"
            >
              Nuevo Chat
            </button>
            <div className="space-y-2">
              {chatSessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between">
                  <button
                    onClick={() => switchChat(session.id)}
                    className={`flex-1 text-left p-2 rounded-lg ${
                      session.id === currentSessionId ? 'bg-blue-100' : 'bg-gray-100'
                    } hover:bg-blue-200`}
                  >
                    {session.title}
                  </button>
                  <button
                    onClick={() => openDeleteModal(session.id)}
                    className="ml-2 text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-gray-100"
                    title="Eliminar Chat"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="md:w-3/4 flex flex-col bg-white rounded-lg shadow-lg">
            <div
              ref={chatContainerRef}
              className="h-[600px] overflow-y-auto p-4 bg-gray-50 rounded-t-lg border border-gray-200"
            >
              {currentSession?.messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex mb-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="relative max-w-[90%] break-words">
                    <div
                      className={`p-3 rounded-lg ${
                        message.role === 'user'
                          ? 'bg-blue-100 text-gray-800'
                          : 'bg-gray-200 text-gray-800'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                    {message.role === 'bot' && (
                      <button
                        onClick={() => handleCopy(message.content)}
                        className="absolute top-1 right-1 text-gray-500 hover:text-gray-700 p-1 rounded-full bg-white hover:bg-gray-100 focus:outline-none"
                        title="Copiar"
                      >
                        <Copy size={20} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleChatSubmit} className="flex items-center p-4 border-t border-gray-200">
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Escribe aquí los datos de la planeación..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-12"
                rows={2}
              />
              <button
                type="submit"
                className="ml-2 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                title="Enviar"
              >
                <Send size={20} />
              </button>
            </form>
          </div>
        </div>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-800 mb-2 text-center">Confirmar Eliminación</h3>
            <p className="text-gray-600 mb-6 text-center">
              ¿Estás seguro de que deseas eliminar este chat? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={closeDeleteModal}
                className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteChat}
                className="px-6 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LessonPlanGenerator;