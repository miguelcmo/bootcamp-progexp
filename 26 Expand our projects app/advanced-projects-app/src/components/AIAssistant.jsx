import { useState } from 'react'
import { generateTaskSuggestions, analyzeProjectProgress } from '../services/groqService'
import { supabase } from '../services/supabaseClient'

export default function AIAssistant({ project, tasks, onTasksGenerated }) {
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('generate') // 'generate' or 'analyze'
  const [suggestedTasks, setSuggestedTasks] = useState([])
  const [analysis, setAnalysis] = useState('')
  const [error, setError] = useState(null)
  const [selectedTasks, setSelectedTasks] = useState(new Set())

  async function handleGenerateTasks() {
    setLoading(true)
    setError(null)
    setSuggestedTasks([])

    try {
      const tasks = await generateTaskSuggestions(project.title, project.description)
      setSuggestedTasks(tasks)
      // Auto-select all tasks by default
      setSelectedTasks(new Set(tasks.map((_, index) => index)))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleAnalyzeProject() {
    setLoading(true)
    setError(null)
    setAnalysis('')

    try {
      const analysisResult = await analyzeProjectProgress(
        project.title,
        project.description,
        tasks
      )
      setAnalysis(analysisResult)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddSelectedTasks() {
    setLoading(true)
    setError(null)

    try {
      const tasksToAdd = suggestedTasks
        .filter((_, index) => selectedTasks.has(index))
        .map(task => ({
          project_id: project.id,
          title: task.title,
          description: task.description,
          status: 'pendiente',
        }))

      const { error: insertError } = await supabase
        .from('tasks')
        .insert(tasksToAdd)

      if (insertError) throw insertError

      // Notify parent component to reload tasks
      if (onTasksGenerated) {
        onTasksGenerated()
      }

      // Close modal and reset state
      setShowModal(false)
      setSuggestedTasks([])
      setSelectedTasks(new Set())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function toggleTaskSelection(index) {
    const newSelected = new Set(selectedTasks)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedTasks(newSelected)
  }

  function handleOpenModal() {
    setShowModal(true)
    setError(null)
    setSuggestedTasks([])
    setAnalysis('')
    setActiveTab('generate')
  }

  function handleCloseModal() {
    setShowModal(false)
    setSuggestedTasks([])
    setAnalysis('')
    setError(null)
    setSelectedTasks(new Set())
  }

  return (
    <>
      <button
        className="btn btn-outline-primary btn-sm"
        onClick={handleOpenModal}
        title="AI Assistant"
      >
        <i className="bi bi-stars me-1"></i>
        AI Assistant
      </button>

      {showModal && (
        <>
          <div className="modal-backdrop show"></div>
          <div className="modal show d-block" tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content">
                <div className="modal-header border-0">
                  <h5 className="modal-title">
                    <i className="bi bi-stars text-primary me-2"></i>
                    AI Project Assistant
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={handleCloseModal}
                  ></button>
                </div>

                <div className="modal-body">
                  {/* Tabs */}
                  <ul className="nav nav-tabs mb-3">
                    <li className="nav-item">
                      <button
                        className={`nav-link ${activeTab === 'generate' ? 'active' : ''}`}
                        onClick={() => setActiveTab('generate')}
                      >
                        <i className="bi bi-lightbulb me-1"></i>
                        Generate Tasks
                      </button>
                    </li>
                    <li className="nav-item">
                      <button
                        className={`nav-link ${activeTab === 'analyze' ? 'active' : ''}`}
                        onClick={() => setActiveTab('analyze')}
                      >
                        <i className="bi bi-graph-up me-1"></i>
                        Analyze Progress
                      </button>
                    </li>
                  </ul>

                  {/* Error display */}
                  {error && (
                    <div className="alert alert-danger" role="alert">
                      <i className="bi bi-exclamation-triangle me-2"></i>
                      {error}
                    </div>
                  )}

                  {/* Generate Tasks Tab */}
                  {activeTab === 'generate' && (
                    <div>
                      <p className="text-muted mb-3">
                        Let AI suggest tasks based on your project description. Select which tasks you want to add.
                      </p>

                      {suggestedTasks.length === 0 ? (
                        <div className="text-center py-4">
                          <button
                            className="btn btn-primary"
                            onClick={handleGenerateTasks}
                            disabled={loading}
                          >
                            {loading ? (
                              <>
                                <span className="spinner-border spinner-border-sm me-2"></span>
                                Generating...
                              </>
                            ) : (
                              <>
                                <i className="bi bi-magic me-2"></i>
                                Generate Task Suggestions
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        <div>
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <h6 className="mb-0">Suggested Tasks ({suggestedTasks.length})</h6>
                            <button
                              className="btn btn-sm btn-outline-secondary"
                              onClick={handleGenerateTasks}
                              disabled={loading}
                            >
                              <i className="bi bi-arrow-clockwise me-1"></i>
                              Regenerate
                            </button>
                          </div>

                          <div className="task-suggestions">
                            {suggestedTasks.map((task, index) => (
                              <div
                                key={index}
                                className={`task-suggestion-item ${selectedTasks.has(index) ? 'selected' : ''}`}
                                onClick={() => toggleTaskSelection(index)}
                              >
                                <div className="form-check">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    checked={selectedTasks.has(index)}
                                    onChange={() => toggleTaskSelection(index)}
                                  />
                                  <label className="form-check-label w-100">
                                    <div className="task-suggestion-title">{task.title}</div>
                                    <div className="task-suggestion-description">{task.description}</div>
                                  </label>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="mt-3 text-end">
                            <button
                              className="btn btn-success"
                              onClick={handleAddSelectedTasks}
                              disabled={selectedTasks.size === 0 || loading}
                            >
                              {loading ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-2"></span>
                                  Adding...
                                </>
                              ) : (
                                <>
                                  <i className="bi bi-plus-circle me-2"></i>
                                  Add {selectedTasks.size} Selected {selectedTasks.size === 1 ? 'Task' : 'Tasks'}
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Analyze Progress Tab */}
                  {activeTab === 'analyze' && (
                    <div>
                      <p className="text-muted mb-3">
                        Get AI-powered insights about your project progress and recommendations for next steps.
                      </p>

                      {!analysis ? (
                        <div className="text-center py-4">
                          <button
                            className="btn btn-primary"
                            onClick={handleAnalyzeProject}
                            disabled={loading || tasks.length === 0}
                          >
                            {loading ? (
                              <>
                                <span className="spinner-border spinner-border-sm me-2"></span>
                                Analyzing...
                              </>
                            ) : (
                              <>
                                <i className="bi bi-graph-up me-2"></i>
                                Analyze Project
                              </>
                            )}
                          </button>

                          {tasks.length === 0 && (
                            <p className="text-muted mt-3 small">
                              Add some tasks to your project first to get meaningful insights.
                            </p>
                          )}
                        </div>
                      ) : (
                        <div>
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <h6 className="mb-0">
                              <i className="bi bi-clipboard-data me-2"></i>
                              Project Analysis
                            </h6>
                            <button
                              className="btn btn-sm btn-outline-secondary"
                              onClick={handleAnalyzeProject}
                              disabled={loading}
                            >
                              <i className="bi bi-arrow-clockwise me-1"></i>
                              Refresh
                            </button>
                          </div>

                          <div className="analysis-content">
                            {analysis.split('\n').map((paragraph, index) => (
                              <p key={index} className="mb-2">{paragraph}</p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="modal-footer border-0">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCloseModal}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <style>{`
        .task-suggestions {
          max-height: 400px;
          overflow-y: auto;
        }

        .task-suggestion-item {
          padding: 0.75rem;
          margin-bottom: 0.5rem;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .task-suggestion-item:hover {
          border-color: #cbd5e1;
          background-color: #f8fafc;
        }

        .task-suggestion-item.selected {
          border-color: #0d6efd;
          background-color: #e7f3ff;
        }

        .task-suggestion-title {
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 0.25rem;
        }

        .task-suggestion-description {
          font-size: 0.875rem;
          color: #64748b;
        }

        .analysis-content {
          background-color: #f8fafc;
          padding: 1.5rem;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          line-height: 1.6;
        }

        .nav-tabs .nav-link {
          border: none;
          color: #64748b;
        }

        .nav-tabs .nav-link.active {
          color: #0d6efd;
          border-bottom: 2px solid #0d6efd;
        }

        .nav-tabs .nav-link:hover {
          color: #0d6efd;
        }
      `}</style>
    </>
  )
}
