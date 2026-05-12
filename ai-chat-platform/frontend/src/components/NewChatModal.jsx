import { useState } from 'react';
import { TASK_TYPES, MODELS } from '../utils/models';

const BADGE_COLORS = {
  green: 'bg-green-500/20 text-green-400',
  blue: 'bg-blue-500/20 text-blue-400',
  purple: 'bg-purple-500/20 text-purple-400',
  yellow: 'bg-yellow-500/20 text-yellow-400',
  pink: 'bg-pink-500/20 text-pink-400',
  orange: 'bg-orange-500/20 text-orange-400',
};

export default function NewChatModal({ onClose, onCreate }) {
  const [step, setStep] = useState(1); // 1=task, 2=model
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedModel, setSelectedModel] = useState(null);
  const [creating, setCreating] = useState(false);

  const handleTaskSelect = (task) => {
    setSelectedTask(task);
    setSelectedModel(MODELS[task.id][0]); // default to first model
    setStep(2);
  };

  const handleCreate = async () => {
    if (!selectedTask || !selectedModel) return;
    setCreating(true);
    await onCreate(selectedTask.id, selectedModel.id);
    setCreating(false);
  };

  const models = selectedTask ? MODELS[selectedTask.id] : [];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div>
            <h2 className="text-white font-semibold text-lg">
              {step === 1 ? 'New Chat' : 'Choose Model'}
            </h2>
            <p className="text-slate-400 text-sm mt-0.5">
              {step === 1 ? 'What do you want to create?' : `Best model for ${selectedTask?.name}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Step indicator */}
            <div className="flex gap-1.5">
              <div className={`w-2 h-2 rounded-full ${step >= 1 ? 'bg-indigo-500' : 'bg-white/20'}`} />
              <div className={`w-2 h-2 rounded-full ${step >= 2 ? 'bg-indigo-500' : 'bg-white/20'}`} />
            </div>
            <button
              onClick={onClose}
              className="ml-2 text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-5">
          {/* Step 1: Task type */}
          {step === 1 && (
            <div className="space-y-3">
              {TASK_TYPES.map(task => (
                <button
                  key={task.id}
                  onClick={() => handleTaskSelect(task)}
                  className="w-full text-left p-4 rounded-xl border border-white/10 hover:border-indigo-500/50 bg-white/3 hover:bg-indigo-600/10 transition-all duration-150 group"
                >
                  <div className="flex items-start gap-4">
                    <div className={`text-3xl p-2 rounded-xl bg-gradient-to-br ${task.color} bg-opacity-20 flex-shrink-0`}>
                      {task.icon}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-semibold group-hover:text-indigo-300 transition-colors">
                        {task.name}
                      </p>
                      <p className="text-slate-400 text-sm mt-0.5">{task.description}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {task.examples.slice(0, 2).map((ex, i) => (
                          <span key={i} className="text-xs bg-white/5 text-slate-400 px-2 py-0.5 rounded-full">
                            "{ex}"
                          </span>
                        ))}
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-slate-500 group-hover:text-indigo-400 flex-shrink-0 mt-0.5 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Model selection */}
          {step === 2 && (
            <div>
              <div className="grid gap-2 mb-5">
                {models.map(model => (
                  <button
                    key={model.id}
                    onClick={() => setSelectedModel(model)}
                    className={`
                      w-full text-left p-3.5 rounded-xl border transition-all duration-150
                      ${selectedModel?.id === model.id
                        ? 'border-indigo-500 bg-indigo-500/10'
                        : 'border-white/10 hover:border-white/20 bg-white/3'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                          selectedModel?.id === model.id ? 'border-indigo-500 bg-indigo-500' : 'border-slate-600'
                        }`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-white text-sm font-medium">{model.name}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${BADGE_COLORS[model.badgeColor] || BADGE_COLORS.blue}`}>
                              {model.badge}
                            </span>
                          </div>
                          <p className="text-slate-400 text-xs mt-0.5">{model.description}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className="text-slate-300 text-xs font-medium">{model.cost}</p>
                        <p className="text-slate-500 text-xs">{model.speed}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:border-white/20 text-sm transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!selectedModel || creating}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-all duration-150 flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Creating...
                    </>
                  ) : (
                    <>Start Chat</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
