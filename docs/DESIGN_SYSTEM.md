# SiteProof Design System & State Brief

## PART 1: DESIGN SYSTEM

### Color Palette

#### Primary Colors

• **Primary Blue** - #0047AB (Construction industry trust, primary actions and emphasis)
• **Primary White** - #FFFFFF (Clean surfaces and content areas)
• **Primary Charcoal** - #1A1F2E (Professional dark tone for text and headers)

#### Secondary Colors

• **Secondary Blue Light** - #4A90E2 (Hover states and secondary UI elements)
• **Secondary Blue Pale** - #E8F0FE (Selected states, subtle backgrounds)
• **Secondary Gray** - #6B7280 (Secondary text and inactive elements)
• **Secondary Light Gray** - #F3F4F6 (Subtle backgrounds, dividers)

#### Accent Colors

• **Accent Orange** - #FF6B35 (Warnings, important notifications, safety alerts)
• **Accent Green** - #22C55E (Success states, completed inspections)
• **Accent Yellow** - #FFC107 (Caution states, pending items)
• **Accent Red** - #EF4444 (Critical issues, non-conformances)

#### Functional Colors

• **Success Green** - #16A34A (Confirmations, completed actions)
• **Error Red** - #DC2626 (Errors, failed validations, critical issues)
• **Warning Orange** - #F59E0B (Warnings, attention required)
• **Info Blue** - #0EA5E9 (Informational messages)

#### Background Colors

• **Background White** - #FFFFFF (Cards and content areas)
• **Background Light** - #F9FAFB (App background)
• **Background Offwhite** - #F5F7FA (Subtle differentiation)
• **Background Dark** - #111827 (Dark mode primary)

### Typography

#### Font Family

• **Primary Font**: Inter (All weights)
• **Alternative Font**: SF Pro Text (iOS) / Roboto (Android)
• **Monospace Font**: SF Mono (For numerical data, measurements)

#### Font Weights

• Regular: 400
• Medium: 500
• Semibold: 600
• Bold: 700

#### Text Styles

##### Headings

• **H1**: 32px/40px, Bold, Letter-spacing -0.025em

- Screen titles and major headers
  • **H2**: 28px/36px, Semibold, Letter-spacing -0.02em
- Section headers and dashboard titles
  • **H3**: 24px/32px, Semibold, Letter-spacing -0.015em
- Card headers and subsections
  • **H4**: 20px/28px, Medium, Letter-spacing -0.01em
- Widget titles and minor headers
  • **H5**: 18px/24px, Medium, Letter-spacing 0
- Small section headers

##### Body Text

• **Body Large**: 17px/24px, Regular, Letter-spacing 0

- Primary reading text for diary entries
  • **Body**: 15px/22px, Regular, Letter-spacing 0
- Standard UI text
  • **Body Small**: 13px/18px, Regular, Letter-spacing 0.01em
- Secondary information and metadata

##### Special Text

• **Caption**: 12px/16px, Medium, Letter-spacing 0.02em

- Timestamps, labels, and metadata
  • **Button Text**: 16px/24px, Medium, Letter-spacing 0.01em
- CTAs and interactive elements
  • **Data Text**: 14px/20px, SF Mono Medium, Letter-spacing 0
- Measurements, costs, numerical data
  • **Link Text**: 15px/22px, Medium, Letter-spacing 0, Primary Blue (#0047AB)
- Clickable navigation elements

### Component Styling

#### Buttons

##### Primary Button

• Background: Primary Blue (#0047AB)
• Text: White (#FFFFFF)
• Height: 48px (mobile) / 40px (desktop)
• Corner Radius: 8px
• Padding: 16px 24px
• Shadow: 0 2px 4px rgba(0, 71, 171, 0.2)
• Hover: Background #003A8C, Shadow 0 4px 8px rgba(0, 71, 171, 0.3)
• Active: Transform scale(0.98)
• Disabled: Opacity 0.5
• Transition: all 200ms ease-out

##### Secondary Button

• Border: 2px solid Primary Blue (#0047AB)
• Text: Primary Blue (#0047AB)
• Background: Transparent
• Height: 48px (mobile) / 40px (desktop)
• Corner Radius: 8px
• Hover: Background rgba(0, 71, 171, 0.05)

##### Danger Button

• Background: Error Red (#DC2626)
• Text: White (#FFFFFF)
• Height: 48px (mobile) / 40px (desktop)
• Used for destructive actions

##### Floating Action Button (FAB)

• Background: Primary Blue (#0047AB)
• Size: 56px × 56px
• Corner Radius: 28px
• Shadow: 0 4px 12px rgba(0, 71, 171, 0.3)
• Position: Fixed bottom-right, 16px margin

#### Cards

• Background: White (#FFFFFF)
• Border: 1px solid #E5E7EB
• Shadow: 0 1px 3px rgba(0, 0, 0, 0.1)
• Corner Radius: 12px
• Padding: 20px
• Hover Shadow: 0 4px 6px rgba(0, 0, 0, 0.1)
• Transition: shadow 200ms ease-out

#### Input Fields

• Height: 56px (mobile) / 48px (desktop)
• Corner Radius: 8px
• Border: 1.5px solid #D1D5DB
• Background: White (#FFFFFF)
• Padding: 12px 16px
• Font Size: 16px (prevents zoom on mobile)
• Text Color: Primary Charcoal (#1A1F2E)
• Placeholder: #9CA3AF
• Focus Border: 2px solid Primary Blue (#0047AB)
• Focus Shadow: 0 0 0 3px rgba(0, 71, 171, 0.1)
• Error Border: 2px solid Error Red (#DC2626)

#### Select/Dropdown

• Same styling as input fields
• Chevron icon: Secondary Gray (#6B7280)
• Dropdown shadow: 0 10px 25px rgba(0, 0, 0, 0.1)

#### Icons

• Navigation Icons: 28px × 28px
• Primary Icons: 24px × 24px
• Small Icons: 20px × 20px
• Micro Icons: 16px × 16px
• Interactive Color: Primary Blue (#0047AB)
• Inactive Color: Secondary Gray (#6B7280)
• Success Color: Accent Green (#22C55E)
• Warning Color: Accent Orange (#FF6B35)

#### Bottom Navigation (Mobile)

• Height: 64px
• Background: White (#FFFFFF)
• Border Top: 1px solid #E5E7EB
• Shadow: 0 -2px 10px rgba(0, 0, 0, 0.05)
• Active Item: Primary Blue (#0047AB)
• Inactive Item: Secondary Gray (#6B7280)

### Spacing System

• 4px - Micro (Icon to text spacing)
• 8px - Tiny (Related elements)
• 12px - Small (Compact spacing)
• 16px - Default (Standard margins)
• 20px - Medium (Card padding)
• 24px - Large (Section spacing)
• 32px - Extra Large (Major sections)
• 48px - Huge (Screen padding)

### Motion & Animation

• **Micro Transitions**: 150ms ease-out (Hover states)
• **Standard Transitions**: 200ms cubic-bezier(0.4, 0, 0.2, 1)
• **Smooth Transitions**: 300ms cubic-bezier(0.4, 0, 0.2, 1) (Modals)
• **Page Transitions**: 350ms cubic-bezier(0.0, 0, 0.2, 1)

#### Animation Patterns

• **Fade In**: opacity 0 → 1
• **Slide Up**: translateY(20px) → translateY(0) with fade
• **Scale**: scale(0.95) → scale(1)
• **Success Check**: Scale + rotate animation for checkmarks
• **Loading Spinner**: Continuous rotation with ease-in-out

### Dark Mode Variants

• Dark Background: #0F172A
• Dark Surface: #1E293B
• Dark Border: #334155
• Dark Text Primary: #F3F4F6
• Dark Text Secondary: #CBD5E1
• Adjusted Primary Blue: #3B82F6 (Better contrast)

### Mobile-Specific Considerations

• Minimum touch target: 44px × 44px
• Increased contrast for outdoor visibility
• Larger fonts for gloved hands
• Swipe gestures for common actions
• Bottom sheet modals instead of center modals
• Persistent offline indicator bar

---

## PART 2: STATE BRIEF

### Authentication & Organization Management

#### Sign Up Screen

##### Initial State

- Clean white background (#FFFFFF) with SiteProof logo centered at top
- Welcome headline: "Build Better, Document Smarter" in H1 Primary Charcoal
- Subtitle: "Join thousands of construction teams digitizing their quality processes" in Body Secondary Gray
- Email input field with icon, placeholder "work@company.com"
- Password input with strength indicator bar underneath
- "Create Account" primary button (disabled until valid input)
- Divider with "OR" text
- "Sign in with Google" secondary button
- "Already have an account? Sign in" link at bottom
- Subtle construction site illustration as background pattern (5% opacity)

##### Validation State

- Real-time email validation with green checkmark when valid
- Password strength indicator transitions from red → yellow → green
- Requirements checklist appears below password (8+ chars, uppercase, number)
- Each requirement gets green checkmark as fulfilled
- Primary button enables with subtle scale animation when all valid
- Error messages slide in below fields with red text and icon

##### Loading State

- Button text replaced with spinning loader
- Form inputs disabled with 50% opacity
- Subtle pulse animation on the entire form card
- Background illustration continues subtle parallax movement

##### Success State

- Form fades out with scale down animation
- Success icon (green checkmark in circle) scales in with bounce
- "Account created! Check your email" message fades in
- Automatic redirect after 2 seconds with slide transition

#### Email Verification Screen

##### Pending State

- Large animated email icon with subtle float animation
- "Verify your email" as H2 headline
- "We've sent a verification link to [email]" in Body text
- Animated progress dots showing email sending
- "Resend email" ghost button (disabled for 60 seconds)
- Countdown timer shows "Resend in 45s" in Caption text
- "Change email address" link at bottom

##### Resend State

- "Resend email" button becomes active with blue color
- Click triggers loading spinner in button
- Success toast slides in from top: "Email resent successfully"
- Timer resets to 60 seconds
- Subtle shake animation if clicked while disabled

##### Verified State

- Email icon transforms to checkmark with smooth morph animation
- "Email verified!" message with confetti particle effect
- "Setting up your workspace..." loading message
- Progress bar fills as workspace initializes
- Smooth transition to organization setup screen

#### Organization Setup Screen

##### Create Organization State

- "Let's set up your workspace" H1 headline
- Organization name input with company icon
- Industry dropdown pre-selected to "Construction"
- Company size selector (radio buttons with icons)
- Address autocomplete field for office location
- "Create Organization" primary button
- Skip option in top right (for invited users)
- Progress indicator showing step 1 of 3

##### Join Organization State

- Different flow for invited users
- "You've been invited to join [Org Name]" headline
- Organization card showing logo, name, member count
- Role display: "You'll join as: Site Inspector"
- "Accept Invitation" primary button
- "Decline" text button below
- Smooth transition to main app after acceptance

### Project & Lot Management

#### Projects Dashboard

##### Empty State

- Illustration of construction site with "No projects yet" message
- "Create your first project" primary button centered
- Quick tour tooltips highlighting key areas
- Sample project card with "Example" badge for preview
- Subtle animation on illustration (crane moving, clouds floating)

##### Active Projects State

- Grid layout of project cards (responsive: 1 col mobile, 3 cols desktop)
- Each card shows:
  - Project name in H4
  - Client name in Body Small Secondary Gray
  - Progress ring showing completion percentage
  - Status badge (Active/On Hold/Completed)
  - Key metrics: X ITPs, Y Lots, Z Team Members
  - Last activity timestamp
  - Quick action menu (three dots)
- Sort/filter bar at top with search
- FAB for creating new project (mobile)
- Hover state: card lifts with shadow, shows "View Project" button

##### Creating Project State

- Modal slides up from bottom (mobile) or center modal (desktop)
- Step 1: Basic Details
  - Project name input (required)
  - Client selection dropdown with "Add new" option
  - Project address with map preview
  - Start/end date pickers
  - Contract value input (optional, role-based visibility)
- Step 2: Project Structure
  - "How many lots/stages?" with number stepper
  - Dynamic lot name inputs appear
  - Lot hierarchy visualization
  - Template selection for common structures
- Step 3: Team Assignment
  - Search bar for team members
  - Role-based assignment cards
  - Drag to reorder team priority
  - "Invite new member" option
- Progress bar at top showing current step
- Smooth transitions between steps with slide animation

#### Lot Management Screen

##### Lot Overview State

- Hierarchical tree view of project lots
- Each lot shows:
  - Lot name with expand/collapse chevron
  - Status indicator (Not Started/In Progress/Complete)
  - Progress bar for ITP completion
  - Number of assigned ITPs
  - Hold points counter with warning color
- Drag handles for reordering (desktop)
- Swipe actions for mobile (edit/delete)
- Breadcrumb navigation at top

##### Lot Detail State

- Full-screen lot view with header showing lot name
- ITP assignment section:
  - Grid of available ITP templates
  - Search/filter by category
  - Drag and drop to assign
  - Or tap to add (mobile)
- Assigned ITPs list:
  - Completion status for each
  - Last inspection date
  - Responsible inspector avatar
  - Priority/sequence numbering
- Team assignment widget
- Activity timeline on right (desktop) or tab (mobile)

### ITP Template System

#### Template Library Screen

##### Browse State

- Category tabs: Concrete, Earthworks, Structural, Paving, Drainage, Custom
- Grid view of template cards
- Each card shows:
  - Template icon based on category
  - Template name
  - Usage count across projects
  - Last updated date
  - Compliance badges (AS/NZS standards)
- Search bar with filters (dropdown)
- "Create Template" primary button (role-based)
- View toggle: Grid/List (desktop only)

##### Template Detail Preview

- Modal with template information
- Header with template name and category
- Description text
- Inspection items preview list
- Required photos indicator
- Hold/witness points highlighted
- Compliance standards listed
- "Use Template" and "Duplicate & Edit" buttons
- Version history tab showing changes

##### Template Creation State

- Full-screen creation interface
- Step 1: Basic Information
  - Template name input
  - Category selection
  - Description textarea
  - Compliance standards multi-select
- Step 2: Add Inspection Items
  - Item type selector (Pass/Fail, Measurement, Text, Photo)
  - Dynamic form based on type:
    - Pass/Fail: Criteria description
    - Measurement: Unit, min/max tolerances
    - Text: Placeholder, character limit
    - Photo: Required/optional, min count
  - Drag to reorder items
  - Duplicate/delete actions
  - Hold/witness point toggles
- Step 3: Review & Save
  - Preview of complete template
  - Test mode to try inputs
  - Save as draft or publish options
- Auto-save indicator with timestamp

### Inspection Workflow

#### Pre-Inspection State

- Lot selection screen with current location indicator
- Smart suggestions based on GPS and schedule
- Recent lots section for quick access
- Each lot card shows:
  - Next ITP due
  - Weather conditions (if relevant)
  - Team members on site
  - Materials status
- Offline indicator if no connection
- "Continue Last Inspection" banner if applicable

#### Active Inspection State

- Full-screen inspection interface
- Header: ITP name, Lot location, Progress (X of Y items)
- Current inspection item prominent:
  - Clear item type indicator
  - Input appropriate to type:
    - Toggle switches for Pass/Fail
    - Number pad for measurements
    - Text area for observations
    - Camera button for photos
- Photo capture integrated:
  - Large camera preview
  - Multiple photo thumbnails
  - Drawing/annotation tools
  - Auto-timestamp overlay
- Navigation: Previous/Next buttons
- "Save Draft" always visible
- Progress bar showing completion

#### Photo Annotation State

- Full-screen photo editor
- Toolbar with tools:
  - Arrow tool (red)
  - Circle/highlight tool
  - Text annotation
  - Measurement tool
  - Undo/redo
- Color picker for annotations
- Save returns to inspection flow
- Pinch to zoom enabled
- Auto-save of annotations

#### Completion State

- Summary screen showing all inputs
- Edit buttons next to each item
- Name confirmation input field
- Legal text about accuracy
- Weather conditions summary
- "Submit Inspection" primary button
- Warning if any items failed
- Success animation with checkmark
- Options: "Start Another" or "Back to Dashboard"

### Non-Conformance Management

#### NCR Creation State

- Triggered from failed inspection or standalone
- Slide-up modal with stepped process:
- Step 1: Issue Details
  - Pre-filled from inspection if applicable
  - Severity selector (Minor/Major/Critical) with color coding
  - Description textarea with voice-to-text option
  - Category dropdown
  - Location picker with lot pre-selected
- Step 2: Evidence
  - Photo upload area (drag or tap)
  - Recent photos from device gallery
  - Document attachment option
  - Photo annotation available
- Step 3: Assignment
  - Responsible party dropdown
  - Due date picker with smart suggestions
  - Cost impact input (if permissions)
  - Notification preview
- Review and submit with loading state

#### NCR List State

- Tab view: Open/In Progress/Closed
- Each NCR card shows:
  - NCR number and severity badge
  - Brief description (truncated)
  - Responsible party avatar
  - Due date with color coding (overdue = red)
  - Status progress indicator
  - Thumbnail of primary photo
- Filter bar with quick filters
- Search by NCR number or description
- Sort options dropdown
- Pull to refresh gesture

#### NCR Resolution State

- Full-screen NCR detail view
- Status workflow diagram at top
- Resolution actions based on role:
  - Add resolution notes
  - Upload resolution evidence
  - Mark as resolved
  - Request verification
- Activity timeline showing all updates
- Comment thread for discussion
- Push notifications for updates

### Smart Daily Diary System

#### Dashboard Hub State

- Modern card-based layout
- Hero metrics section:
  - Live weather widget with conditions
  - Team on site counter with avatars
  - Active ITPs count with progress
  - Today's cost tracker (role-based visibility)
- Quick action grid:
  - Start Daily Entry (primary)
  - Quick Photo
  - Log Workforce
  - Add Site Note
- Recent entries list (last 5 days)
- Upcoming inspections reminder
- Site alerts/notices banner

#### Daily Entry Creation State

- Progressive form with smart defaults:
- Section 1: Conditions
  - Weather auto-filled with edit option
  - Site conditions checkboxes
  - Ground conditions selector
- Section 2: Workforce
  - Quick-add from frequent workers
  - Company profile search
  - Bulk time entry mode
  - Trade categorization
  - Visitor log with purpose
- Section 3: Progress
  - Work completed today (textarea)
  - Location/chainage inputs
  - Percentage complete slider
  - Photo timeline builder
- Section 4: Issues & Instructions
  - Delays/impacts with severity
  - Site instructions received
  - RFIs raised
  - Safety observations
- Floating save indicator
- End-of-day review summary

#### Workforce Logging State

- Search bar with recent selections
- Profile cards showing:
  - Name and trade
  - Company affiliation
  - Certification badges
  - Quick-select checkbox
- Bulk actions toolbar:
  - Set start/end time for selected
  - Apply lunch break
  - Copy from yesterday
- Time picker with 15-min increments
- Running total of hours
- Cost calculation (admin view only)

#### Photo Timeline State

- Camera interface optimized for batch capture
- Thumbnail strip of today's photos
- Drag to reorder photos
- Quick caption for each photo
- Automatic timestamp and GPS
- Upload queue with progress
- Low-quality preview while uploading
- Success indicators as uploads complete

### Financial Tracking

#### Cost Dashboard State (Admin/PM Only)

- Real-time metrics cards:
  - Today's labour cost with trend arrow
  - Equipment/plant costs
  - Material costs
  - Projected weekly total
- Burn rate chart (actual vs budget)
- Cost breakdown pie chart by category
- Recent transactions list
- Export options menu
- Date range selector
- Drill-down capability on any metric

#### Company Profiles Management State

- Tab view: Employees/Equipment/Subcontractors
- Employee profiles grid:
  - Photo, name, trade
  - Current project assignment
  - Hourly rate (hidden from field)
  - Certifications with expiry
  - Quick edit pencil icon
- Bulk import option
- Add new profile wizard
- Search and filter bar
- Active/inactive toggle

### Reporting Suite

#### Report Generation State

- Report type selector with icons:
  - Daily Diary Report
  - ITP Register
  - NCR Summary
  - Cost Report
  - Photo Package
- Date range picker with presets
- Include/exclude options:
  - Photos (resolution selector)
  - Signatures
  - Cost data (role-based)
  - Weather data
- Preview pane showing sample
- Generate button with time estimate
- Progress bar during generation
- Download options: PDF, Excel, ZIP

#### Report Preview State

- Full-screen PDF viewer
- Pagination controls
- Zoom controls
- Share button with options:
  - Email
  - Save to device
  - Print
  - Cloud storage
- Watermark options
- Professional layout with company branding

### Offline Mode States

#### Offline Indicator

- Persistent banner at top: "Offline Mode - Changes will sync when connected"
- Orange color (#FF6B35) for visibility
- Sync queue counter showing pending items
- Manual sync button (disabled while offline)

#### Sync State

- When connection restored:
  - Banner changes to "Syncing..." with progress
  - Animated sync icon
  - Queue items counting down
  - Success toast when complete
- If sync conflicts:
  - Conflict resolution modal
  - Side-by-side comparison
  - Accept mine/theirs/merge options
  - Detailed changelog

### Loading States

#### Skeleton Screens

- Card-shaped loading placeholders
- Shimmer animation effect
- Maintains layout structure
- Progressive content reveal

#### Pull to Refresh

- Branded loading animation
- Construction-themed spinner (rotating hard hat)
- Elastic overscroll effect
- Success haptic feedback

### Error States

#### Form Validation Errors

- Inline error messages below fields
- Red border on invalid fields
- Error icon with tooltip
- Clear error description
- Suggestion for fixing

#### Connection Errors

- Full-screen error illustration
- "No connection" message
- Retry button
- Offline mode option
- Contact support link

### Empty States

#### No Data States

- Contextual illustrations:
  - No projects: Construction site beginning
  - No ITPs: Clipboard illustration
  - No photos: Camera illustration
- Helpful message explaining next steps
- Primary CTA to create first item
- Learn more link to help docs

### Success States

#### Action Confirmations

- Toast notifications sliding from top
- Green background with white text
- Success icon with subtle animation
- Auto-dismiss after 3 seconds
- Undo option where applicable

#### Major Success Moments

- Full-screen success for major actions:
  - Project completion
  - Audit passed
  - Monthly goal achieved
- Celebration animation (confetti/particles)
- Share achievement option
- Continue button to next action

### Accessibility States

#### High Contrast Mode

- Increased color contrast ratios
- Bolder text weights
- Larger touch targets
- Simplified backgrounds
- Focus indicators more prominent

#### Text Size Adjustments

- Support for dynamic type
- Layout reflows gracefully
- Minimum 16px base size
- Line height adjustments
- Maintains readability at 200% zoom
