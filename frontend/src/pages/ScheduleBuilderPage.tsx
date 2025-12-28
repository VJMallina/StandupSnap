import React, { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import ArtifactsNavigation from '../components/artifacts/ArtifactsNavigation';
import { useProjectSelection } from '../context/ProjectSelectionContext';
import { schedulesApi } from '../services/api/schedules';
import { teamMembersApi } from '../services/api/teamMembers';
import {
  Schedule,
  ScheduleTask,
  CreateScheduleInput,
  UpdateScheduleInput,
  CreateTaskInput,
  UpdateTaskInput,
  CreateDependencyInput,
} from '../types/schedule';
import { TeamMember } from '../types/teamMember';
import { GanttChart } from '../components/schedule/GanttChart';
import { TaskListPanel } from '../components/schedule/TaskListPanel';
import { TimelineToolbar } from '../components/schedule/TimelineToolbar';
import { TaskFormModal } from '../components/schedule/TaskFormModal';
import { ScheduleFormModal } from '../components/schedule/ScheduleFormModal';
import { TaskDetailPanel } from '../components/schedule/TaskDetailPanel';
import { DependencyFormModal } from '../components/schedule/DependencyFormModal';

const ScheduleBuilderPage: React.FC = () => {
  const { selectedProjectId } = useProjectSelection();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [tasks, setTasks] = useState<ScheduleTask[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ScheduleTask | null>(null);
  const [parentTaskIdForNewTask, setParentTaskIdForNewTask] = useState<string | undefined>(undefined);
  const [taskModalMode, setTaskModalMode] = useState<'create' | 'edit'>('create');
  const [scheduleModalMode, setScheduleModalMode] = useState<'create' | 'edit'>('create');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dependency and detail panel states
  const [isDependencyModalOpen, setIsDependencyModalOpen] = useState(false);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
  const [detailPanelTask, setDetailPanelTask] = useState<ScheduleTask | null>(null);

  // View settings
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [showTaskList, setShowTaskList] = useState(true);
  const [showCriticalPath, setShowCriticalPath] = useState(false);
  const [showLegend, setShowLegend] = useState(true);
  const [taskListWidth, setTaskListWidth] = useState(() => {
    const saved = localStorage.getItem('scheduleBuilder.taskListWidth');
    return saved ? parseInt(saved, 10) : 384; // Default 384px (w-96)
  });
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    if (selectedProjectId) {
      fetchData();
    }
  }, [selectedProjectId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [schedulesData, membersData] = await Promise.all([
        schedulesApi.getByProject(selectedProjectId!),
        teamMembersApi.getProjectTeam(selectedProjectId!),
      ]);
      setSchedules(schedulesData);
      setTeamMembers(membersData);

      if (schedulesData.length > 0 && !selectedSchedule) {
        const firstSchedule = schedulesData[0];
        setSelectedSchedule(firstSchedule);
        await loadTasks(firstSchedule.id);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async (scheduleId: string) => {
    try {
      const tasksData = await schedulesApi.getTasks(scheduleId);
      setTasks(tasksData);
    } catch (err) {
      console.error('Error loading tasks:', err);
    }
  };

  const handleScheduleSubmit = async (data: CreateScheduleInput | UpdateScheduleInput) => {
    try {
      setIsSubmitting(true);
      if (scheduleModalMode === 'create') {
        const newSchedule = await schedulesApi.create(data as CreateScheduleInput);
        setSchedules([newSchedule, ...schedules]);
        setSelectedSchedule(newSchedule);
        setTasks([]);
      } else if (selectedSchedule) {
        const updatedSchedule = await schedulesApi.update(selectedSchedule.id, data as UpdateScheduleInput);
        setSchedules(schedules.map(s => s.id === updatedSchedule.id ? updatedSchedule : s));
        setSelectedSchedule(updatedSchedule);
      }
      setIsScheduleModalOpen(false);
    } catch (err) {
      console.error(`Error ${scheduleModalMode === 'create' ? 'creating' : 'updating'} schedule:`, err);
      alert(`Failed to ${scheduleModalMode === 'create' ? 'create' : 'update'} schedule. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScheduleChange = async (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    await loadTasks(schedule.id);
  };

  const handleTaskSubmit = async (data: CreateTaskInput | UpdateTaskInput) => {
    if (!selectedSchedule) return;

    try {
      setIsSubmitting(true);
      if (taskModalMode === 'create') {
        const newTask = await schedulesApi.createTask(selectedSchedule.id, data as CreateTaskInput);
        // Trigger auto-scheduling if task has dependencies or is in AUTO mode
        if (newTask.predecessors && newTask.predecessors.length > 0) {
          await schedulesApi.autoScheduleTask(newTask.id);
        }
      } else if (selectedTask) {
        await schedulesApi.updateTask(selectedTask.id, data as UpdateTaskInput);
        // Trigger auto-scheduling if task is in AUTO mode or has AUTO successors
        await schedulesApi.autoScheduleTask(selectedTask.id);
      }
      await loadTasks(selectedSchedule.id);
      setIsTaskModalOpen(false);
      setSelectedTask(null);
    } catch (err: any) {
      console.error(`Error ${taskModalMode === 'create' ? 'creating' : 'updating'} task:`, err);
      alert(err.message || `Failed to ${taskModalMode === 'create' ? 'create' : 'update'} task. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await schedulesApi.deleteTask(taskId);
      await loadTasks(selectedSchedule!.id);
    } catch (err) {
      console.error('Error deleting task:', err);
      alert('Failed to delete task. Please try again.');
    }
  };

  const handleTaskClick = (task: ScheduleTask) => {
    setDetailPanelTask(task);
    setIsDetailPanelOpen(true);
  };

  const handleEditTask = (task: ScheduleTask) => {
    setSelectedTask(task);
    setTaskModalMode('edit');
    setIsTaskModalOpen(true);
    setIsDetailPanelOpen(false);
  };

  const handleAddDependency = (task: ScheduleTask) => {
    setSelectedTask(task);
    setIsDependencyModalOpen(true);
  };

  const handleCreateDependency = async (data: CreateDependencyInput) => {
    if (!selectedTask) return;

    try {
      setIsSubmitting(true);
      await schedulesApi.addDependency(selectedTask.id, data);
      // Trigger auto-scheduling for the successor task (selectedTask) and its successors
      await schedulesApi.autoScheduleTask(selectedTask.id);
      await loadTasks(selectedSchedule!.id);
      setIsDependencyModalOpen(false);
    } catch (err: any) {
      console.error('Error creating dependency:', err);
      alert(err.message || 'Failed to create dependency. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDependency = async (dependencyId: string) => {
    if (!window.confirm('Are you sure you want to delete this dependency?')) return;

    try {
      await schedulesApi.deleteDependency(dependencyId);
      // Trigger full schedule auto-scheduling since we don't know which task was affected
      if (selectedSchedule) {
        await schedulesApi.autoScheduleAll(selectedSchedule.id);
      }
      await loadTasks(selectedSchedule!.id);
    } catch (err) {
      console.error('Error deleting dependency:', err);
      alert('Failed to delete dependency. Please try again.');
    }
  };

  const handleAddChildTask = (parentTask: ScheduleTask) => {
    setSelectedTask(null);
    setParentTaskIdForNewTask(parentTask.id);
    setTaskModalMode('create');
    setIsTaskModalOpen(true);
  };

  const handleAddNewTask = () => {
    setSelectedTask(null);
    setParentTaskIdForNewTask(undefined);
    setTaskModalMode('create');
    setIsTaskModalOpen(true);
  };

  const handleTaskDateUpdate = async (task: ScheduleTask, startDate: Date, endDate: Date) => {
    try {
      await schedulesApi.updateTask(task.id, {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      });
      // Trigger auto-scheduling for successors
      await schedulesApi.autoScheduleTask(task.id);
      await loadTasks(selectedSchedule!.id);
    } catch (err) {
      console.error('Error updating task dates:', err);
      alert('Failed to update task dates. Please try again.');
    }
  };

  const handleInlineTaskDateUpdate = async (taskId: string, startDate: string, endDate: string) => {
    try {
      await schedulesApi.updateTask(taskId, {
        startDate,
        endDate,
      });
      // Trigger auto-scheduling for successors
      await schedulesApi.autoScheduleTask(taskId);
      await loadTasks(selectedSchedule!.id);
    } catch (err) {
      console.error('Error updating task dates:', err);
      alert('Failed to update task dates. Please try again.');
    }
  };

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    if (!selectedSchedule) return;

    try {
      if (format === 'csv') {
        exportToCSV();
      } else if (format === 'excel') {
        exportToExcel();
      } else if (format === 'pdf') {
        exportToPDF();
      }
    } catch (err) {
      console.error(`Error exporting to ${format}:`, err);
      alert(`Failed to export schedule to ${format.toUpperCase()}. Please try again.`);
    }
  };

  const exportToCSV = () => {
    if (!selectedSchedule || tasks.length === 0) return;

    // Build CSV headers
    const headers = ['WBS', 'Task Name', 'Start Date', 'End Date', 'Status', 'Progress', 'Assignee', 'Duration (days)', 'Dependencies'];

    // Build CSV rows
    const rows = tasks.map(task => {
      const duration = Math.ceil(
        (new Date(task.endDate).getTime() - new Date(task.startDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      const dependencies = task.predecessors?.map(dep => dep.predecessorTask?.wbsCode).filter(Boolean).join(', ') || '';

      return [
        task.wbsCode,
        `"${task.title}"`,
        new Date(task.startDate).toLocaleDateString(),
        new Date(task.endDate).toLocaleDateString(),
        task.status,
        `${task.progress}%`,
        task.assignee?.user?.name || task.assignee?.user?.email || '',
        duration,
        dependencies
      ];
    });

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${selectedSchedule.name}_schedule.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToExcel = async () => {
    if (!selectedSchedule || tasks.length === 0) return;

    // Dynamic import to reduce bundle size
    const XLSX = await import('xlsx');

    // Prepare data for Excel
    const data = tasks.map(task => {
      const duration = Math.ceil(
        (new Date(task.endDate).getTime() - new Date(task.startDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      const dependencies = task.predecessors?.map(dep => dep.predecessorTask?.wbsCode).filter(Boolean).join(', ') || '';

      return {
        'WBS': task.wbsCode,
        'Task Name': task.title,
        'Start Date': new Date(task.startDate).toLocaleDateString(),
        'End Date': new Date(task.endDate).toLocaleDateString(),
        'Duration (days)': duration,
        'Status': task.status,
        'Progress': `${task.progress}%`,
        'Assignee': task.assignee?.user?.name || task.assignee?.user?.email || '',
        'Dependencies': dependencies,
        'Notes': task.notes || ''
      };
    });

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(data);

    // Set column widths
    ws['!cols'] = [
      { wch: 10 }, // WBS
      { wch: 30 }, // Task Name
      { wch: 12 }, // Start Date
      { wch: 12 }, // End Date
      { wch: 10 }, // Duration
      { wch: 15 }, // Status
      { wch: 10 }, // Progress
      { wch: 20 }, // Assignee
      { wch: 20 }, // Dependencies
      { wch: 30 }, // Notes
    ];

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Schedule');

    // Download Excel file
    XLSX.writeFile(wb, `${selectedSchedule.name}_schedule.xlsx`);
  };

  const exportToPDF = async () => {
    if (!selectedSchedule || tasks.length === 0) return;

    try {
      // Dynamic import to reduce bundle size
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      const html2canvas = (await import('html2canvas')).default;

      const doc = new jsPDF('l', 'mm', 'a4'); // landscape orientation

      // Title
      doc.setFontSize(16);
      doc.text(selectedSchedule.name, 14, 15);

      // Schedule details
      doc.setFontSize(10);
      doc.text(`Schedule: ${new Date(selectedSchedule.scheduleStartDate).toLocaleDateString()} - ${new Date(selectedSchedule.scheduleEndDate).toLocaleDateString()}`, 14, 22);
      if (selectedSchedule.description) {
        doc.text(`Description: ${selectedSchedule.description}`, 14, 28);
      }

      let currentY = selectedSchedule.description ? 32 : 26;

      // Capture Gantt Chart
      const ganttElement = document.querySelector('.gantt-container') as HTMLElement;
      if (ganttElement) {
        try {
          // Add loading indicator
          doc.setFontSize(10);
          doc.text('Gantt Chart:', 14, currentY);
          currentY += 6;

          const canvas = await html2canvas(ganttElement, {
            backgroundColor: '#ffffff',
            scale: 2,
            logging: false,
            useCORS: true
          });

          const imgData = canvas.toDataURL('image/png');
          const imgWidth = 260; // fit to page width with margins
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          // Check if we need a new page
          if (currentY + imgHeight > 190) {
            doc.addPage();
            currentY = 15;
          }

          doc.addImage(imgData, 'PNG', 14, currentY, imgWidth, imgHeight);
          currentY += imgHeight + 10;

          // Add new page for table
          doc.addPage();
          currentY = 15;
        } catch (err) {
          console.error('Error capturing Gantt chart:', err);
          // Continue without Gantt chart if capture fails
        }
      }

      // Table data
      const tableData = tasks.map(task => {
        const duration = Math.ceil(
          (new Date(task.endDate).getTime() - new Date(task.startDate).getTime()) / (1000 * 60 * 60 * 24)
        );

        return [
          task.wbsCode,
          task.title,
          new Date(task.startDate).toLocaleDateString(),
          new Date(task.endDate).toLocaleDateString(),
          `${duration}d`,
          task.status,
          `${task.progress}%`,
          task.assignee?.user?.name || task.assignee?.user?.email || ''
        ];
      });

      // Task List Title
      doc.setFontSize(12);
      doc.text('Task List', 14, currentY);
      currentY += 6;

      // Add table
      autoTable(doc, {
        startY: currentY,
        head: [['WBS', 'Task Name', 'Start Date', 'End Date', 'Duration', 'Status', 'Progress', 'Assignee']],
        body: tableData,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [59, 130, 246], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        columnStyles: {
          0: { cellWidth: 15 }, // WBS
          1: { cellWidth: 60 }, // Task Name
          2: { cellWidth: 25 }, // Start Date
          3: { cellWidth: 25 }, // End Date
          4: { cellWidth: 18 }, // Duration
          5: { cellWidth: 30 }, // Status
          6: { cellWidth: 18 }, // Progress
          7: { cellWidth: 40 }, // Assignee
        }
      });

      // Download PDF
      doc.save(`${selectedSchedule.name}_schedule.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      throw err;
    }
  };

  const handleToggleCriticalPath = async () => {
    if (!selectedSchedule) return;

    const newShowCriticalPath = !showCriticalPath;
    setShowCriticalPath(newShowCriticalPath);

    // When enabling critical path view, calculate it
    if (newShowCriticalPath) {
      try {
        await schedulesApi.calculateCriticalPath(selectedSchedule.id);
        await loadTasks(selectedSchedule.id);
      } catch (err) {
        console.error('Error calculating critical path:', err);
        alert('Failed to calculate critical path. Please try again.');
        setShowCriticalPath(false);
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isResizing) {
      const newWidth = e.clientX;
      // Constrain width between 250px and 800px
      if (newWidth >= 250 && newWidth <= 800) {
        setTaskListWidth(newWidth);
      }
    }
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isResizing, taskListWidth]);

  // Save width to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('scheduleBuilder.taskListWidth', taskListWidth.toString());
  }, [taskListWidth]);

  if (!selectedProjectId) {
    return (
      <AppLayout>
        <ArtifactsNavigation />
        <div className="flex items-center justify-center h-screen">
          <p className="text-gray-500">Please select a project to continue.</p>
        </div>
      </AppLayout>
    );
  }

  if (loading) {
    return (
      <AppLayout>
        <ArtifactsNavigation />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading schedules...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <ArtifactsNavigation />
      <div className={`flex flex-col h-screen ${isResizing ? 'cursor-col-resize select-none' : ''}`}>
        {/* Toolbar */}
        <TimelineToolbar
          selectedSchedule={selectedSchedule}
          schedules={schedules}
          viewMode={viewMode}
          showTaskList={showTaskList}
          showCriticalPath={showCriticalPath}
          showLegend={showLegend}
          onViewModeChange={setViewMode}
          onScheduleChange={handleScheduleChange}
          onCreateSchedule={() => {
            setScheduleModalMode('create');
            setIsScheduleModalOpen(true);
          }}
          onCreateTask={() => {
            setTaskModalMode('create');
            setSelectedTask(null);
            setIsTaskModalOpen(true);
          }}
          onToggleTaskList={() => setShowTaskList(!showTaskList)}
          onToggleCriticalPath={handleToggleCriticalPath}
          onToggleLegend={() => setShowLegend(!showLegend)}
          onExport={handleExport}
        />

        {/* Main Content */}
        {!selectedSchedule ? (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <svg className="w-20 h-20 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Schedule Selected</h3>
              <p className="text-gray-500 mb-6">Create a schedule to start planning your project timeline</p>
              <button
                onClick={() => {
                  setScheduleModalMode('create');
                  setIsScheduleModalOpen(true);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
              >
                Create Schedule
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden relative">
            {/* Task List Sidebar */}
            {showTaskList && (
              <>
                <div style={{ width: taskListWidth, flexShrink: 0 }}>
                  <TaskListPanel
                    tasks={tasks}
                    onTaskClick={handleTaskClick}
                    onEditTask={handleEditTask}
                    onDeleteTask={handleDeleteTask}
                    onAddChildTask={handleAddChildTask}
                    onAddTask={handleAddNewTask}
                    onUpdateTaskDates={handleInlineTaskDateUpdate}
                  />
                </div>

                {/* Resize Handle */}
                <div
                  onMouseDown={handleMouseDown}
                  className={`w-1 hover:w-2 bg-gray-200 hover:bg-primary-400 cursor-col-resize transition-all ${
                    isResizing ? 'w-2 bg-primary-500' : ''
                  }`}
                  style={{
                    userSelect: 'none',
                    position: 'relative',
                    zIndex: 10,
                  }}
                >
                  <div className="absolute inset-y-0 -left-1 -right-1" />
                </div>
              </>
            )}

            {/* Gantt Chart */}
            <div className="flex-1 overflow-hidden" key={`gantt-${showTaskList ? taskListWidth : 'full'}`}>
              <GanttChart
                tasks={tasks}
                viewMode={viewMode}
                onTaskClick={handleTaskClick}
                onTaskUpdate={handleTaskDateUpdate}
              />
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <ScheduleFormModal
        isOpen={isScheduleModalOpen}
        mode={scheduleModalMode}
        schedule={scheduleModalMode === 'edit' ? selectedSchedule : null}
        projectId={selectedProjectId!}
        onSubmit={handleScheduleSubmit}
        onClose={() => {
          setIsScheduleModalOpen(false);
        }}
        isSubmitting={isSubmitting}
      />

      <TaskFormModal
        isOpen={isTaskModalOpen}
        mode={taskModalMode}
        task={taskModalMode === 'edit' ? selectedTask : null}
        scheduleId={selectedSchedule?.id || ''}
        teamMembers={teamMembers}
        tasks={tasks}
        defaultParentTaskId={parentTaskIdForNewTask}
        onSubmit={handleTaskSubmit}
        onClose={() => {
          setIsTaskModalOpen(false);
          setSelectedTask(null);
          setParentTaskIdForNewTask(undefined);
        }}
        isSubmitting={isSubmitting}
      />

      {/* Task Detail Panel */}
      <TaskDetailPanel
        task={detailPanelTask}
        isOpen={isDetailPanelOpen}
        onClose={() => {
          setIsDetailPanelOpen(false);
          setDetailPanelTask(null);
        }}
        onEdit={handleEditTask}
        onAddDependency={handleAddDependency}
        onDeleteDependency={handleDeleteDependency}
      />

      {/* Dependency Form Modal */}
      {selectedTask && (
        <DependencyFormModal
          isOpen={isDependencyModalOpen}
          currentTask={selectedTask}
          availableTasks={tasks}
          onSubmit={handleCreateDependency}
          onClose={() => {
            setIsDependencyModalOpen(false);
          }}
          isSubmitting={isSubmitting}
        />
      )}
    </AppLayout>
  );
};

export default ScheduleBuilderPage;
