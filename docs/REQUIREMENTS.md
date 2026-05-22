# REQUIREMENTS

---

## 1. Introduction
### 1.1 Purpose
The Job Application Tracker helps users record and manage their job applications, track progress across different hiring stages, and keep notes on job requirements and personal feedback.
### 1.2 Background / Motivation
As a job seeker, managing and tracking numerous job applications becomes increasingly tedious and overwhelming, particularly when pursuing remote opportunities. The modern job search often requires submitting hundreds of applications before securing a position, creating significant organizational challenges.

**Current Pain Points:**
- **Inadequate Tracking Tools**: Traditional methods like Excel spreadsheets are insufficient for managing complex application data and workflows
- **Calendar Integration Issues**: Interview schedules and important deadlines require immediate calendar entries to prevent missed opportunities
- **Information Retrieval Challenges**: Recalling specific job details, required skills, and previous interview feedback becomes difficult over time
- **Context Loss**: Critical information about job descriptions and interview history is often scattered or lost

**Project Vision:**
This project aims to create an intuitive, comprehensive system that streamlines the job application tracking process. By centralizing all job-related information and providing smart organizational features, we help job seekers maintain better control over their job search journey and improve their chances of success.
### 1.3 Scope

This system provides comprehensive job application tracking capabilities with the following core functionalities and boundaries:

**Core Capabilities:**
- **Application Management**: Record, edit, and organize job applications with detailed information
- **Progress Tracking**: Monitor application status through hiring stages (Applied, Phone Screen, Interview, Offer, Rejected)
- **Information Storage**: Maintain job requirements, descriptions, and personal notes for each application
- **Calendar Integration**: Schedule and manage interview appointments, deadlines, and important dates
- **Application Limits Tracking**: Monitor and enforce company-specific application restrictions (e.g., maximum applications per time period)
- **Multi-dimensional Views**: Organize and visualize data by skills, position types, companies, locations, and other criteria
- **Search and Filtering**: Quick access to applications based on various parameters

**Future Enhancements:**
- **AI-Powered Analysis**: Intelligent recommendations and application insights
- **Smart Resume Optimization**: AI-driven resume modifications tailored to specific positions
- **Interview Preparation**: Automated interview guides and skill development recommendations

**System Boundaries:**
- Primary focus on individual job seekers (single-user system for open-source version)
- Local deployment with optional cloud demo
- Integration capabilities with calendar systems and email platforms

**Multi-User Strategy:**
- **Open Source Version**: Single-user local deployment (Docker-based)
- **Commercial Demo**: Multi-user SaaS version for validation and potential monetization
- **Hybrid Approach**: Core functionality remains open-source, premium features (multi-user, advanced analytics) in hosted version

---

## 2. Stakeholders & User Profiles
### 2.1 Primary User

**Target Audience**: Individual job seekers actively pursuing career opportunities, particularly those applying for remote positions or conducting extensive job searches.

**User Characteristics:**
- Professionals managing high-volume job searches (typically 100-1000+ applications)
- Remote work seekers facing challenges with distributed application processes
- Career changers requiring comprehensive tracking and skill development insights

**Core Usage Scenarios:**
- **Application Volume Management**: Track extensive application portfolios with multiple interview rounds per position
- **Calendar and Schedule Management**: Create calendar events and alerts for interviews, deadlines, and follow-ups
- **Interview Preparation**: Access consolidated job requirements and skill summaries for targeted preparation
- **Progress Monitoring**: Maintain detailed records of application status across various hiring stages

**Future Usage Scenarios:**
- **Skills Gap Analysis**: Compare personal qualifications against job requirements to identify learning opportunities
- **Professional Development**: Access integrated skill development resources and course recommendations
- **Career Network Building**: Share anonymized professional profiles for recruiter and career coach connections

### 2.2 Secondary Stakeholders

**Future Multi-User Support:**
- **Career Coaches**: Guidance professionals helping clients optimize their job search strategies
- **Recruiters**: Talent acquisition specialists seeking qualified candidates through the platform
- **HR Professionals**: Company representatives managing candidate pipeline and feedback processes

---

## 3. System Overview

**Deployment options (initial plan)**: Docker-based local deployment + optional public demo.

**Technology stack (initial plan)**:

- Frontend: React + Tailwind CSS

- Backend: Node.js/NestJS

- Database: PostgreSQL

- Containerization: Docker Compose

---

## 4. Functional Requirements

(Each requirement should have an ID for traceability, e.g., FR-1, FR-2)

### 4.1 Core Features
| ID | Feature | Description | Priority |
|---|---|---|---|
| FR-1 | Job Record Management | Add, edit, delete job applications with fields: company, position, source, job link, location, salary (optional). | High |
| FR-2 | Multi-Round Progress Tracking | Track detailed hiring process with multiple rounds: each round includes type (Online Assessment, HR Screen, Technical Interview, Manager Interview, etc.), date/time, status (Scheduled, Completed, Passed, Rejected, Waiting), and personal notes/feedback. Support overall application status and round-by-round historical view. | High |
| FR-3 | Job Requirements | Save job description or key requirements. | Medium |
| FR-4 | AI Skills Extraction | Automatically extract required skills and technologies from job descriptions. | Medium |
| FR-5 | Notes & Feedback | User can add personal notes and interview feedback. | Medium |
| FR-6 | Search & Filter | Filter by company, status, date, tags. | High |
| FR-7 | Reminders/Deadlines | Optional reminders for interviews or deadlines. | Medium |
### 4.2 Optional / Future Features
| ID | Feature | Description | Priority |
|---|---|---|---|
| FR-8 | Calendar View | Visualize upcoming interviews. | Medium |
| FR-9 | Email Parsing | Auto-extract job details from emails. | Medium |
| FR-10 | AI Resume Matching | Analyze resume-job compatibility and suggest improvements. | Low |
| FR-11 | AI Interview Preparation | Generate personalized interview questions and preparation materials based on job requirements. | Low |
| FR-12 | Smart Progress Analytics | Provide insights on application patterns, success rates, and optimization suggestions. | Low |
| FR-13 | Multi-user Support | Enable account-based access for career coaches and teams. | Low |

---

## 5. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Performance | System should handle at least 1,000 job records without noticeable latency. |
| Security | Support HTTPS (for online demo); local Docker deployment stores data securely. |
| Usability | Intuitive UI for non-technical users with multi-round tracking interface. |
| Portability | Deployable on Linux/Mac/Windows via Docker Compose. |
| Maintainability | Clear code structure, modular components, CI/CD ready. |
| Scalability | Architecture should support future multi-user expansion. |

---

## 6. Data Model / Database Design (Initial Draft)

Entities:

User (future multi-user)

JobApplication (company, position, status, job_link, requirements, notes, dates)

Interview (date, type, result, feedback)

Provide ER Diagram placeholder.

---

## 7. System Architecture (High-Level)

Describe chosen architecture (Frontend–Backend–DB).

Show an initial architecture diagram (to be detailed in docs/architecture.md).

Mention Docker containers and network.

---

## 8. User Interface Requirements

### 8.1 Core Interface Components

**Dashboard (list view + filters)**
- Application overview table with sorting and filtering capabilities
- Quick status indicators and progress summaries

**Job detail page**
- Comprehensive application information display
- Round-by-round interview tracking interface

**Add/Edit job form**
- Streamlined data entry with validation
- Optional round tracking activation

**Calendar/Timeline view**
- Visual representation of upcoming interviews and deadlines

### 8.2 Multi-Round Progress Tracking Interface Design

**Application Status Overview:**
```
Application Status: In Progress (Round 3/4) | Expected Completion: 2024-02-05

Company: TechCorp Inc.  |  Position: Senior Software Engineer
───────────────────────────────────────────────────────────
```

**Round-by-Round Timeline:**
```
Round History:
┌─ Round 1: Online Assessment ✅ Passed (2024-01-15)
│  ├─ Duration: 90 minutes  Type: Algorithms + System Design
│  └─ Personal Notes: Challenging algorithm questions, focus on data structures and complexity analysis
│
├─ Round 2: HR Interview ✅ Passed (2024-01-22)  
│  ├─ Duration: 30 minutes  Interviewer: Sarah Chen (HR Manager)
│  └─ Personal Notes: Asked about salary expectations and work preferences, emphasized teamwork and remote work capabilities
│
├─ Round 3: Technical Interview 🕐 Awaiting Results (2024-01-29)
│  ├─ Duration: 60 minutes  Interviewer: Mike Johnson (Tech Lead)
│  └─ Personal Notes: In-depth project discussion, live coding session, interviewer was professional and friendly
│
└─ Round 4: Final Interview 📅 Scheduled (2024-02-05 14:00)
   ├─ Interviewer: David Liu (Engineering Director)
   └─ Preparation Notes: Prepare for deep project discussion, understand team culture and development plans
```

**Interactive Elements:**
- Collapsible/expandable detailed information for each round
- Status icons: ✅ Passed ❌ Rejected 🕐 Waiting 📅 Scheduled ⏰ Reminder
- Quick actions: Add round, edit notes, set reminders
- Timeline view toggle options

**User Experience Flow:**
1. **Simplified Mode**: Display only overall status, suitable for quick overview
2. **Detailed Mode**: Expand all round information, suitable for comprehensive review
3. **Edit Mode**: Allow adding/modifying round information and personal summaries

### 8.3 AI Skills Extraction Interface (MVP+)

**Auto-Extracted Skills Display:**
```
📋 Job Requirements Analysis (Auto-extracted from description)

🛠️ Technical Skills Identified:
├─ Languages: JavaScript, TypeScript, Python
├─ Frameworks: React, Node.js, Express
├─ Databases: PostgreSQL, Redis
├─ Cloud/DevOps: AWS, Docker, Kubernetes
└─ Tools: Git, Jira, Figma

💼 Experience Level: Senior (5+ years mentioned)
🏢 Work Arrangement: Remote-friendly, Hybrid options
📍 Location: San Francisco, CA (Remote OK)

[✏️ Edit Skills] [➕ Add Missing Skills] [🔄 Re-analyze]
```

**Skills Management Interface:**
```
🏷️ Skill Tags for this Position:
#React #NodeJS #TypeScript #AWS #Docker #PostgreSQL #Senior

Quick Actions:
├─ 📊 Compare with my skills
├─ 🎯 Mark as target skills to learn
├─ 📝 Add to interview preparation notes
└─ 🔍 Find similar positions
```

---

## 9. Deployment & Distribution

Local development setup (Node.js + Docker).

Docker Compose for one-click deployment.

Optional public demo (e.g., Render, Vercel + free DB).

---

## 10. Future Roadmap

### 10.1 Development Phases

**Phase 1: MVP (Open Source Single-User)**
- Basic CRUD operations for job applications
- Multi-round progress tracking with timeline interface
- Local Docker deployment
- Core search and filtering capabilities
- **AI Skills Extraction**: Automatically parse job descriptions to extract required skills and technologies using local NLP libraries

**Phase 2: Enhanced Features**
- Calendar integration and reminders
- Advanced tagging and categorization system
- Import/Export functionality
- Email parsing for job details extraction
- **Basic AI Matching**: Keyword-based compatibility scoring between user skills and job requirements
- **Interview Question Database**: Curated common interview questions based on job types and technologies

**Phase 3: Advanced AI Intelligence**
- **Smart Interview Preparation**: AI-generated personalized prep materials and question prediction
- **Company Intelligence**: Automated company research and insights aggregation
- **Skills Gap Analysis**: Advanced comparison of personal qualifications against market demands
- **Application Pattern Analytics**: Success rate analysis and optimization recommendations
- **Resume Optimization**: AI-driven resume suggestions tailored to specific positions

**Phase 4: Commercial Expansion & Advanced AI**
- **Market Intelligence**: Industry trends, salary analysis, demand forecasting
- **Career Path Planning**: Long-term skill development and growth recommendations
- **Multi-user SaaS version**: Team collaboration with AI insights and analytics
- **Enterprise Features**: Advanced reporting, bulk operations, team management

### 10.2 AI Implementation Strategy

**Phase 1 - MVP AI (Skills Extraction Only):**
```javascript
// Technical Implementation Preview
const skillsExtractor = {
  categories: {
    languages: ['JavaScript', 'Python', 'Java', 'TypeScript', 'Go', 'Rust', 'C++'],
    frameworks: ['React', 'Vue', 'Angular', 'Node.js', 'Express', 'Django', 'Spring'],
    databases: ['PostgreSQL', 'MongoDB', 'MySQL', 'Redis', 'Elasticsearch'],
    cloud: ['AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform'],
    tools: ['Git', 'Jenkins', 'Jira', 'Figma', 'Slack', 'Webpack']
  },
  
  extract: (jobDescription) => {
    // Simple pattern matching with context awareness
    const text = jobDescription.toLowerCase();
    const extracted = {};
    
    Object.keys(this.categories).forEach(category => {
      extracted[category] = this.categories[category].filter(skill =>
        this.findSkillInContext(text, skill.toLowerCase())
      );
    });
    
    return {
      skills: extracted,
      experienceLevel: this.extractExperienceLevel(text),
      workType: this.extractWorkArrangement(text),
      location: this.extractLocation(jobDescription)
    };
  }
};
```

**Technology Approach:**
- **Local Processing**: Use JavaScript NLP libraries (`natural.js`, `compromise.js`) for privacy
- **No External Dependencies**: 100% offline functionality in MVP
- **Expandable Architecture**: Design for future AI service integration
- **User Control**: Allow manual editing and verification of extracted data

**Phase 2+ - Enhanced AI:**
- **Hybrid Approach**: Local processing for basic features, optional cloud AI for advanced analysis
- **API Integration**: OpenAI GPT-4 API with user consent and privacy controls
- **Vector Databases**: Semantic search and matching capabilities
- **Web Scraping**: Automated company research and market data collection

### 10.3 Strategic Approach

**Dual-Track Strategy:**
- **Open Source Track**: Maintain single-user local deployment with core functionality and basic AI features
- **Commercial Track**: Develop hosted multi-user SaaS with advanced AI capabilities for market validation
- **Community Building**: Foster open-source community while exploring commercial AI opportunities
- **Feature Differentiation**: 
  - Open Source: Basic skills extraction, local processing
  - Commercial: Advanced AI insights, company research, market analytics

**AI Ethics and Privacy:**
- **Privacy-First**: All MVP AI features work completely offline
- **Transparent AI**: Clear indication when AI features are active
- **User Control**: Easy opt-out from any AI processing
- **Data Ownership**: Users maintain full control over their data and AI insights

---

## 11. Risks & Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| Data privacy (if online demo) | High | Use demo database / anonymized data |
| User adoption | Medium | Provide clean UI, one-click deployment |
| Maintenance overhead | Medium | Modular architecture, good documentation |
| Feature complexity (multi-round tracking) | Medium | Phased implementation, user testing |
| AI accuracy and reliability | Medium | Start with simple pattern matching, provide manual override options |
| Commercial vs Open-Source balance | Medium | Clear feature differentiation strategy |
| AI dependency and costs | Low | Local-first approach, optional cloud features |

---

## 12. References

Links to similar open-source trackers or project management tools for inspiration.