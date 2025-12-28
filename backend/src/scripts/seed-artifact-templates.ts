import { DataSource } from 'typeorm';
import { ArtifactTemplate } from '../entities/artifact-template.entity';
import { ArtifactCategory } from '../entities/artifact-template.entity';
import dataSource from '../data-source';

const systemTemplates = [
  // PROJECT GOVERNANCE
  {
    name: 'Project Charter',
    description: 'Define project purpose, objectives, stakeholders, and high-level requirements',
    category: ArtifactCategory.PROJECT_GOVERNANCE,
    isSystemTemplate: true,
    templateStructure: {
      fields: [
        {
          id: 'project-name',
          type: 'text',
          label: 'Project Name',
          required: true,
        },
        {
          id: 'project-purpose',
          type: 'RICH_TEXT',
          label: 'Project Purpose',
          required: true,
          placeholder: 'Describe the purpose and business need for this project',
        },
        {
          id: 'objectives',
          type: 'RICH_TEXT',
          label: 'Project Objectives',
          required: true,
          placeholder: 'List the key objectives this project aims to achieve',
        },
        {
          id: 'scope',
          type: 'RICH_TEXT',
          label: 'Project Scope',
          required: true,
          placeholder: 'Define what is included and excluded from the project',
        },
        {
          id: 'success-criteria',
          type: 'RICH_TEXT',
          label: 'Success Criteria',
          required: true,
          placeholder: 'How will success be measured?',
        },
        {
          id: 'assumptions',
          type: 'RICH_TEXT',
          label: 'Assumptions',
          required: false,
          placeholder: 'List key assumptions',
        },
        {
          id: 'constraints',
          type: 'RICH_TEXT',
          label: 'Constraints',
          required: false,
          placeholder: 'List key constraints (budget, time, resources)',
        },
        {
          id: 'high-level-requirements',
          type: 'RICH_TEXT',
          label: 'High-Level Requirements',
          required: false,
          placeholder: 'Summarize major requirements',
        },
      ],
    },
  },
  {
    name: 'Governance Framework',
    description: 'Define project governance structure, roles, and decision-making processes',
    category: ArtifactCategory.PROJECT_GOVERNANCE,
    isSystemTemplate: true,
    templateStructure: {
      fields: [
        {
          id: 'governance-model',
          type: 'select',
          label: 'Governance Model',
          required: true,
          options: ['Steering Committee', 'Project Board', 'Executive Sponsor', 'Custom'],
        },
        {
          id: 'decision-authority',
          type: 'RICH_TEXT',
          label: 'Decision Authority Matrix',
          required: true,
          placeholder: 'Define who has authority for different types of decisions',
        },
        {
          id: 'escalation-process',
          type: 'RICH_TEXT',
          label: 'Escalation Process',
          required: true,
          placeholder: 'How will issues be escalated?',
        },
        {
          id: 'reporting-frequency',
          type: 'select',
          label: 'Reporting Frequency',
          required: true,
          options: ['Daily', 'Weekly', 'Bi-weekly', 'Monthly'],
        },
      ],
    },
  },

  // PLANNING & BUDGETING
  {
    name: 'Project Budget',
    description: 'Track project costs, allocations, and budget performance',
    category: ArtifactCategory.PLANNING_BUDGETING,
    isSystemTemplate: true,
    templateStructure: {
      fields: [
        {
          id: 'total-budget',
          type: 'text',
          label: 'Total Approved Budget',
          required: true,
          placeholder: '$0.00',
        },
        {
          id: 'labor-costs',
          type: 'text',
          label: 'Labor Costs',
          required: false,
          placeholder: '$0.00',
        },
        {
          id: 'material-costs',
          type: 'text',
          label: 'Material/Equipment Costs',
          required: false,
          placeholder: '$0.00',
        },
        {
          id: 'contractor-costs',
          type: 'text',
          label: 'Contractor/Vendor Costs',
          required: false,
          placeholder: '$0.00',
        },
        {
          id: 'contingency-reserve',
          type: 'text',
          label: 'Contingency Reserve',
          required: false,
          placeholder: '$0.00',
        },
        {
          id: 'budget-notes',
          type: 'textarea',
          label: 'Budget Notes',
          required: false,
          placeholder: 'Additional budget details and assumptions',
        },
      ],
    },
  },
  {
    name: 'Requirements Document',
    description: 'Document functional and non-functional requirements',
    category: ArtifactCategory.PLANNING_BUDGETING,
    isSystemTemplate: true,
    templateStructure: {
      fields: [
        {
          id: 'functional-requirements',
          type: 'RICH_TEXT',
          label: 'Functional Requirements',
          required: true,
          placeholder: 'List what the system/project must do',
        },
        {
          id: 'non-functional-requirements',
          type: 'RICH_TEXT',
          label: 'Non-Functional Requirements',
          required: false,
          placeholder: 'Performance, security, usability requirements',
        },
        {
          id: 'user-stories',
          type: 'RICH_TEXT',
          label: 'User Stories',
          required: false,
          placeholder: 'As a [user type], I want [goal] so that [reason]',
        },
        {
          id: 'acceptance-criteria',
          type: 'RICH_TEXT',
          label: 'Acceptance Criteria',
          required: true,
          placeholder: 'Define what "done" means for each requirement',
        },
      ],
    },
  },

  // EXECUTION & MONITORING
  {
    name: 'Status Report',
    description: 'Regular project status updates on progress, issues, and metrics',
    category: ArtifactCategory.EXECUTION_MONITORING,
    isSystemTemplate: true,
    templateStructure: {
      fields: [
        {
          id: 'reporting-period',
          type: 'text',
          label: 'Reporting Period',
          required: true,
          placeholder: 'e.g., Week of Jan 1-7, 2025',
        },
        {
          id: 'overall-status',
          type: 'select',
          label: 'Overall Status',
          required: true,
          options: ['On Track', 'At Risk', 'Off Track'],
        },
        {
          id: 'accomplishments',
          type: 'RICH_TEXT',
          label: 'Key Accomplishments',
          required: true,
          placeholder: 'What was completed this period?',
        },
        {
          id: 'planned-activities',
          type: 'RICH_TEXT',
          label: 'Planned Activities (Next Period)',
          required: true,
          placeholder: 'What will be worked on next?',
        },
        {
          id: 'risks-issues',
          type: 'RICH_TEXT',
          label: 'Risks & Issues',
          required: false,
          placeholder: 'Active risks and issues requiring attention',
        },
        {
          id: 'schedule-variance',
          type: 'text',
          label: 'Schedule Variance',
          required: false,
          placeholder: 'Days ahead/behind schedule',
        },
        {
          id: 'budget-variance',
          type: 'text',
          label: 'Budget Variance',
          required: false,
          placeholder: 'Amount over/under budget',
        },
      ],
    },
  },
  {
    name: 'Action Items Tracker',
    description: 'Track action items, owners, and completion status',
    category: ArtifactCategory.EXECUTION_MONITORING,
    isSystemTemplate: true,
    templateStructure: {
      fields: [
        {
          id: 'action-item',
          type: 'textarea',
          label: 'Action Item Description',
          required: true,
        },
        {
          id: 'owner',
          type: 'text',
          label: 'Owner',
          required: true,
        },
        {
          id: 'due-date',
          type: 'date',
          label: 'Due Date',
          required: true,
        },
        {
          id: 'status',
          type: 'select',
          label: 'Status',
          required: true,
          options: ['Not Started', 'In Progress', 'Completed', 'Blocked'],
        },
        {
          id: 'notes',
          type: 'textarea',
          label: 'Notes',
          required: false,
        },
      ],
    },
  },

  // RISK & QUALITY
  {
    name: 'Quality Management Plan',
    description: 'Define quality standards, metrics, and assurance processes',
    category: ArtifactCategory.RISK_QUALITY,
    isSystemTemplate: true,
    templateStructure: {
      fields: [
        {
          id: 'quality-objectives',
          type: 'RICH_TEXT',
          label: 'Quality Objectives',
          required: true,
          placeholder: 'What quality standards will be met?',
        },
        {
          id: 'quality-metrics',
          type: 'RICH_TEXT',
          label: 'Quality Metrics',
          required: true,
          placeholder: 'How will quality be measured?',
        },
        {
          id: 'quality-assurance',
          type: 'RICH_TEXT',
          label: 'Quality Assurance Activities',
          required: true,
          placeholder: 'Reviews, audits, testing approaches',
        },
        {
          id: 'quality-control',
          type: 'RICH_TEXT',
          label: 'Quality Control Processes',
          required: true,
          placeholder: 'Inspection, testing, defect tracking',
        },
      ],
    },
  },
  {
    name: 'Test Plan',
    description: 'Define testing strategy, scope, and acceptance criteria',
    category: ArtifactCategory.RISK_QUALITY,
    isSystemTemplate: true,
    templateStructure: {
      fields: [
        {
          id: 'test-scope',
          type: 'RICH_TEXT',
          label: 'Test Scope',
          required: true,
          placeholder: 'What will be tested?',
        },
        {
          id: 'test-approach',
          type: 'RICH_TEXT',
          label: 'Test Approach',
          required: true,
          placeholder: 'Unit, integration, system, UAT testing strategy',
        },
        {
          id: 'test-environment',
          type: 'RICH_TEXT',
          label: 'Test Environment',
          required: false,
          placeholder: 'Describe the testing environment setup',
        },
        {
          id: 'test-schedule',
          type: 'RICH_TEXT',
          label: 'Test Schedule',
          required: false,
          placeholder: 'When will testing occur?',
        },
        {
          id: 'entry-criteria',
          type: 'RICH_TEXT',
          label: 'Entry Criteria',
          required: true,
          placeholder: 'What must be ready before testing?',
        },
        {
          id: 'exit-criteria',
          type: 'RICH_TEXT',
          label: 'Exit Criteria',
          required: true,
          placeholder: 'When is testing complete?',
        },
      ],
    },
  },

  // CLOSURE & REPORTING
  {
    name: 'Lessons Learned',
    description: 'Capture what went well, what didn\'t, and recommendations for future projects',
    category: ArtifactCategory.CLOSURE_REPORTING,
    isSystemTemplate: true,
    templateStructure: {
      fields: [
        {
          id: 'what-went-well',
          type: 'RICH_TEXT',
          label: 'What Went Well',
          required: true,
          placeholder: 'Successes and positive outcomes',
        },
        {
          id: 'what-didnt-go-well',
          type: 'RICH_TEXT',
          label: 'What Didn\'t Go Well',
          required: true,
          placeholder: 'Challenges and issues encountered',
        },
        {
          id: 'recommendations',
          type: 'RICH_TEXT',
          label: 'Recommendations',
          required: true,
          placeholder: 'What would you do differently next time?',
        },
        {
          id: 'process-improvements',
          type: 'RICH_TEXT',
          label: 'Process Improvements',
          required: false,
          placeholder: 'Suggestions for process improvements',
        },
        {
          id: 'best-practices',
          type: 'RICH_TEXT',
          label: 'Best Practices to Share',
          required: false,
          placeholder: 'Practices that should be adopted by other teams',
        },
      ],
    },
  },
  {
    name: 'Project Closure Report',
    description: 'Final project summary including outcomes, deliverables, and handoff',
    category: ArtifactCategory.CLOSURE_REPORTING,
    isSystemTemplate: true,
    templateStructure: {
      fields: [
        {
          id: 'project-summary',
          type: 'RICH_TEXT',
          label: 'Project Summary',
          required: true,
          placeholder: 'High-level overview of the project',
        },
        {
          id: 'objectives-met',
          type: 'RICH_TEXT',
          label: 'Objectives Met',
          required: true,
          placeholder: 'Were project objectives achieved?',
        },
        {
          id: 'deliverables-completed',
          type: 'RICH_TEXT',
          label: 'Deliverables Completed',
          required: true,
          placeholder: 'List all deliverables and their status',
        },
        {
          id: 'final-budget',
          type: 'text',
          label: 'Final Budget vs. Actual',
          required: false,
          placeholder: 'Budget variance summary',
        },
        {
          id: 'final-schedule',
          type: 'text',
          label: 'Final Schedule vs. Actual',
          required: false,
          placeholder: 'Schedule variance summary',
        },
        {
          id: 'handoff-notes',
          type: 'RICH_TEXT',
          label: 'Handoff Notes',
          required: true,
          placeholder: 'Information for ongoing support/maintenance team',
        },
        {
          id: 'final-recommendations',
          type: 'RICH_TEXT',
          label: 'Final Recommendations',
          required: false,
          placeholder: 'Any final recommendations for stakeholders',
        },
      ],
    },
  },

  // Additional templates
  {
    name: 'Communication Plan',
    description: 'Define stakeholder communication strategy and frequency',
    category: ArtifactCategory.PLANNING_BUDGETING,
    isSystemTemplate: true,
    templateStructure: {
      fields: [
        {
          id: 'stakeholder-groups',
          type: 'RICH_TEXT',
          label: 'Stakeholder Groups',
          required: true,
          placeholder: 'List key stakeholder groups',
        },
        {
          id: 'communication-methods',
          type: 'RICH_TEXT',
          label: 'Communication Methods',
          required: true,
          placeholder: 'Email, meetings, reports, dashboards, etc.',
        },
        {
          id: 'frequency',
          type: 'RICH_TEXT',
          label: 'Communication Frequency',
          required: true,
          placeholder: 'How often will each stakeholder group be updated?',
        },
        {
          id: 'responsible-party',
          type: 'text',
          label: 'Responsible Party',
          required: true,
          placeholder: 'Who owns communication?',
        },
      ],
    },
  },
  {
    name: 'Meeting Minutes',
    description: 'Record decisions, action items, and discussion points from meetings',
    category: ArtifactCategory.EXECUTION_MONITORING,
    isSystemTemplate: true,
    templateStructure: {
      fields: [
        {
          id: 'meeting-title',
          type: 'text',
          label: 'Meeting Title',
          required: true,
        },
        {
          id: 'meeting-date',
          type: 'date',
          label: 'Meeting Date',
          required: true,
        },
        {
          id: 'attendees',
          type: 'textarea',
          label: 'Attendees',
          required: true,
          placeholder: 'List attendees',
        },
        {
          id: 'agenda',
          type: 'textarea',
          label: 'Agenda',
          required: false,
          placeholder: 'Meeting agenda items',
        },
        {
          id: 'discussion-points',
          type: 'RICH_TEXT',
          label: 'Discussion Points',
          required: true,
          placeholder: 'Key discussion points and decisions',
        },
        {
          id: 'action-items',
          type: 'RICH_TEXT',
          label: 'Action Items',
          required: true,
          placeholder: 'Actions, owners, and due dates',
        },
        {
          id: 'next-meeting',
          type: 'text',
          label: 'Next Meeting',
          required: false,
          placeholder: 'Date and time of next meeting',
        },
      ],
    },
  },
];

async function seedTemplates() {
  try {
    console.log('Initializing database connection...');
    await dataSource.initialize();

    const templateRepository = dataSource.getRepository(ArtifactTemplate);

    console.log('Checking for existing system templates...');
    const existingTemplates = await templateRepository.find({
      where: { isSystemTemplate: true },
    });

    if (existingTemplates.length > 0) {
      console.log(`Found ${existingTemplates.length} existing system templates.`);
      console.log('Deleting existing system templates to avoid duplicates...');
      await templateRepository.remove(existingTemplates);
    }

    console.log(`Seeding ${systemTemplates.length} system templates...`);

    for (const templateData of systemTemplates) {
      const template = templateRepository.create({
        ...templateData,
        projectId: null,
        createdById: null, // System templates have no creator
      });

      await templateRepository.save(template);
      console.log(`✓ Created template: ${template.name}`);
    }

    console.log(`\n✓ Successfully seeded ${systemTemplates.length} artifact templates!`);
    console.log('\nTemplate categories:');
    console.log(`  - PROJECT_GOVERNANCE: ${systemTemplates.filter(t => t.category === ArtifactCategory.PROJECT_GOVERNANCE).length} templates`);
    console.log(`  - PLANNING_BUDGETING: ${systemTemplates.filter(t => t.category === ArtifactCategory.PLANNING_BUDGETING).length} templates`);
    console.log(`  - EXECUTION_MONITORING: ${systemTemplates.filter(t => t.category === ArtifactCategory.EXECUTION_MONITORING).length} templates`);
    console.log(`  - RISK_QUALITY: ${systemTemplates.filter(t => t.category === ArtifactCategory.RISK_QUALITY).length} templates`);
    console.log(`  - CLOSURE_REPORTING: ${systemTemplates.filter(t => t.category === ArtifactCategory.CLOSURE_REPORTING).length} templates`);

    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding templates:', error);
    process.exit(1);
  }
}

seedTemplates();
