import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Download, ArrowLeft, Home, Users, BarChart3, PieChart, Target, DollarSign, TrendingUp, Search, Plus, Settings, Calendar, FileText, UserCircle, Building2, Phone, Mail, MapPin, Filter, Upload, Clock, AlertTriangle, Sparkles } from "lucide-react";
import { Link } from "wouter";

export default function UserManualPage() {
  const handleDownload = () => {
    const content = document.getElementById('manual-content');
    if (!content) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bloom & Grow CRM - User Manual</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 900px;
            margin: 0 auto;
            padding: 40px 20px;
          }
          h1 { color: #f97316; border-bottom: 3px solid #f97316; padding-bottom: 10px; }
          h2 { color: #0d9488; margin-top: 30px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
          h3 { color: #374151; margin-top: 20px; }
          .section { margin-bottom: 30px; page-break-inside: avoid; }
          .tip { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 15px 0; border-radius: 4px; }
          .note { background: #dbeafe; border-left: 4px solid #3b82f6; padding: 12px 16px; margin: 15px 0; border-radius: 4px; }
          .warning { background: #fee2e2; border-left: 4px solid #ef4444; padding: 12px 16px; margin: 15px 0; border-radius: 4px; }
          ul, ol { margin-left: 20px; }
          li { margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th, td { border: 1px solid #e5e7eb; padding: 10px; text-align: left; }
          th { background: #f3f4f6; }
          .cover { text-align: center; margin-bottom: 60px; }
          .cover h1 { font-size: 2.5em; border: none; }
          .cover p { color: #6b7280; font-size: 1.1em; }
          .toc { background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 40px; }
          .toc ul { list-style: none; margin: 0; padding: 0; }
          .toc li { padding: 5px 0; }
          @media print {
            body { padding: 20px; }
            .section { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="cover">
          <h1>Bloom & Grow CRM</h1>
          <p>Customer Relations Management System</p>
          <p><strong>User Manual</strong></p>
          <p>Version 1.0 | November 2025</p>
        </div>

        <div class="toc">
          <h2 style="margin-top: 0;">Table of Contents</h2>
          <ul>
            <li>1. Getting Started</li>
            <li>2. Navigation & Layout</li>
            <li>3. Dashboard (Home)</li>
            <li>4. Customer Management</li>
            <li>5. Sales Dashboard</li>
            <li>6. Analytics</li>
            <li>7. Admin Dashboard</li>
            <li>8. Additional Features</li>
            <li>9. AI-Powered Features</li>
            <li>10. Tips & Best Practices</li>
          </ul>
        </div>

        <div class="section">
          <h2>1. Getting Started</h2>
          
          <h3>1.1 Logging In</h3>
          <ol>
            <li>Open the application in your web browser</li>
            <li>Enter your username and password</li>
            <li>Click the "Login" button</li>
          </ol>
          <div class="tip">
            <strong>Tip:</strong> Contact your administrator if you forget your password or need account access.
          </div>

          <h3>1.2 User Roles</h3>
          <p>The system has different access levels based on your role:</p>
          <table>
            <tr><th>Role</th><th>Access Level</th></tr>
            <tr><td>CEO</td><td>Full access to all features and all regional data</td></tr>
            <tr><td>Sales Director</td><td>Full access to team management and analytics</td></tr>
            <tr><td>Regional Manager</td><td>Access to regional team data and analytics</td></tr>
            <tr><td>Manager</td><td>Access to team data and reporting</td></tr>
            <tr><td>Salesman</td><td>Access to personal customers and sales data</td></tr>
          </table>
        </div>

        <div class="section">
          <h2>2. Navigation & Layout</h2>
          
          <h3>2.1 Sidebar Navigation</h3>
          <p>The left sidebar provides access to all main sections:</p>
          <ul>
            <li><strong>Home:</strong> Your personalized dashboard with daily priorities</li>
            <li><strong>Customers:</strong> Manage your customer database</li>
            <li><strong>Sales Dashboard:</strong> View and manage sales targets and performance</li>
            <li><strong>Analytics:</strong> Detailed performance metrics and charts</li>
            <li><strong>Segments:</strong> Customer segmentation tools</li>
            <li><strong>Pipeline:</strong> Sales pipeline visualization</li>
            <li><strong>Comparative:</strong> Compare performance across periods</li>
            <li><strong>Admin Dashboard:</strong> User management (managers and above)</li>
          </ul>

          <h3>2.2 Header Features</h3>
          <ul>
            <li><strong>Global Search:</strong> Use Cmd/Ctrl + K to quickly search customers, interactions, and tasks</li>
            <li><strong>Currency Selector:</strong> Choose your preferred display currency</li>
            <li><strong>Theme Toggle:</strong> Switch between light and dark modes</li>
          </ul>

          <h3>2.3 Quick Action Button</h3>
          <p>The floating "+" button in the bottom-right corner provides quick access to:</p>
          <ul>
            <li>Add new customer</li>
            <li>Log a call</li>
            <li>Log a visit</li>
            <li>Record a sale</li>
            <li>Create a task</li>
          </ul>
        </div>

        <div class="section">
          <h2>3. Dashboard (Home)</h2>
          
          <h3>3.1 Today's Priorities</h3>
          <p>The dashboard shows important alerts at the top:</p>
          <ul>
            <li><strong>Overdue Tasks:</strong> Tasks that need immediate attention</li>
            <li><strong>Today's Tasks:</strong> Tasks scheduled for today</li>
            <li><strong>Follow-up Reminders:</strong> Customers requiring follow-up</li>
          </ul>

          <h3>3.2 KPI Cards</h3>
          <p>Five key performance indicators with month-over-month trends:</p>
          <ul>
            <li>Total Customers</li>
            <li>Monthly Revenue</li>
            <li>Active Leads</li>
            <li>Conversion Rate</li>
            <li>Tasks Completed</li>
          </ul>

          <h3>3.3 AI Next Best Action</h3>
          <p>AI-powered recommendations for which customers to contact today, including:</p>
          <ul>
            <li>Priority level (High/Medium/Low)</li>
            <li>Suggested action type</li>
            <li>Reasoning for recommendation</li>
          </ul>

          <h3>3.4 At-Risk Customers</h3>
          <p>Shows customers needing attention with color-coded status badges.</p>

          <h3>3.5 Interactive Calendar</h3>
          <p>Visual calendar displaying:</p>
          <ul>
            <li>Scheduled tasks and interactions</li>
            <li>Color-coded by type (calls, visits, follow-ups)</li>
            <li>Click any date to view details</li>
          </ul>
        </div>

        <div class="section">
          <h2>4. Customer Management</h2>
          
          <h3>4.1 Viewing Customers</h3>
          <p>The Customers page offers multiple ways to view your data:</p>
          <ul>
            <li><strong>Grid View:</strong> Card-based layout for visual overview</li>
            <li><strong>List View:</strong> Table format for detailed information</li>
          </ul>

          <h3>4.2 Filtering Customers</h3>
          <ul>
            <li><strong>Search:</strong> Type to search by company name, contact, or email</li>
            <li><strong>Country Filter:</strong> Filter by region (Hong Kong, Singapore, Australia, etc.)</li>
            <li><strong>Stage Filter:</strong> Filter by customer stage (Lead, Prospect, Customer)</li>
            <li><strong>At-Risk Filter:</strong> Show only customers needing attention</li>
          </ul>

          <h3>4.3 Adding a New Customer</h3>
          <ol>
            <li>Click the "Add Customer" button or use the Quick Action menu</li>
            <li>Fill in the required fields:
              <ul>
                <li>Company Name</li>
                <li>Country</li>
                <li>Contact Name and Email</li>
                <li>Stage (Lead/Prospect/Customer)</li>
              </ul>
            </li>
            <li>Add optional information: Phone, Address, Retailer Type, Brands</li>
            <li>Click "Save" to create the customer</li>
          </ol>
          <div class="note">
            <strong>Note:</strong> The system will check for duplicates based on company name and email to prevent duplicate entries.
          </div>

          <h3>4.4 Customer Details</h3>
          <p>Click on any customer to open their detail modal, which includes:</p>
          <ul>
            <li><strong>Overview Tab:</strong> Basic company information and contacts</li>
            <li><strong>Interactions Tab:</strong> History of calls, visits, and notes</li>
            <li><strong>Sales Tab:</strong> Sales history and targets</li>
            <li><strong>Addresses Tab:</strong> Multiple address management</li>
            <li><strong>AI Insights:</strong> AI-generated analysis and recommendations</li>
            <li><strong>Churn Risk:</strong> Risk assessment with factors and recommendations</li>
          </ul>

          <h3>4.5 Logging Interactions</h3>
          <ol>
            <li>Open a customer's detail modal</li>
            <li>Go to the Interactions tab</li>
            <li>Click "Log Interaction"</li>
            <li>Select type: Call, Visit, Email, Note, or Follow-up</li>
            <li>Add notes and details</li>
            <li>Save the interaction</li>
          </ol>

          <h3>4.6 Bulk Import</h3>
          <p>To import multiple customers at once:</p>
          <ol>
            <li>Click the "Import" button</li>
            <li>Download the Excel template</li>
            <li>Fill in your customer data following the template format</li>
            <li>Upload the completed file</li>
            <li>Review and confirm the import</li>
          </ol>

          <h3>4.7 Days Since Last Contact</h3>
          <p>Each customer card shows how many days since last contact:</p>
          <ul>
            <li><strong>Green:</strong> Recently contacted (within 7 days)</li>
            <li><strong>Yellow:</strong> Needs attention (7-14 days)</li>
            <li><strong>Red:</strong> Overdue (14+ days)</li>
          </ul>
        </div>

        <div class="section">
          <h2>5. Sales Dashboard</h2>
          
          <h3>5.1 Monthly Targets</h3>
          <p>View and manage sales targets:</p>
          <ul>
            <li>Personal monthly targets</li>
            <li>Team targets (for managers)</li>
            <li>Progress tracking with visual indicators</li>
          </ul>

          <h3>5.2 Sales Recording</h3>
          <ol>
            <li>Navigate to a customer's detail modal</li>
            <li>Go to the Sales tab</li>
            <li>Click "Record Sale"</li>
            <li>Enter the amount and details</li>
            <li>Save the sale</li>
          </ol>

          <h3>5.3 Budget vs. Actuals</h3>
          <p>The dashboard shows:</p>
          <ul>
            <li>Target amount for the period</li>
            <li>Actual sales achieved</li>
            <li>Variance (over/under target)</li>
            <li>Progress percentage</li>
          </ul>

          <h3>5.4 Export Reports</h3>
          <p>Click the "Export" button to download sales reports in Excel format.</p>
        </div>

        <div class="section">
          <h2>6. Analytics</h2>
          
          <h3>6.1 Performance Metrics</h3>
          <ul>
            <li>Sales by region</li>
            <li>Customer acquisition trends</li>
            <li>Conversion rates</li>
            <li>Revenue breakdowns</li>
          </ul>

          <h3>6.2 Month Selector</h3>
          <p>Use the month selector to view historical data and compare performance across periods.</p>

          <h3>6.3 Team Performance</h3>
          <p>Managers can view:</p>
          <ul>
            <li>Individual team member performance</li>
            <li>Team totals and averages</li>
            <li>Performance rankings</li>
          </ul>
        </div>

        <div class="section">
          <h2>7. Admin Dashboard</h2>
          <p><em>Available to Managers and above</em></p>
          
          <h3>7.1 User Management</h3>
          <ul>
            <li>View all users in the system</li>
            <li>Filter by role, region, or status</li>
            <li>Edit user details and assignments</li>
          </ul>

          <h3>7.2 Team Structure</h3>
          <p>Visualize the organizational hierarchy and reporting relationships.</p>

          <h3>7.3 Regional Leaderboard</h3>
          <p>View top-performing salespeople by region.</p>

          <h3>7.4 User Details</h3>
          <p>Click on any user to view:</p>
          <ul>
            <li>Personal performance metrics</li>
            <li>Assigned customers</li>
            <li>Activity history</li>
            <li>AI-generated performance summary</li>
          </ul>
        </div>

        <div class="section">
          <h2>8. Additional Features</h2>
          
          <h3>8.1 Pipeline View</h3>
          <p>Visual pipeline showing customers by stage with weighted values:</p>
          <ul>
            <li>Leads: 20% weighting</li>
            <li>Prospects: 50% weighting</li>
            <li>Customers: 100% weighting</li>
          </ul>

          <h3>8.2 Segments</h3>
          <p>Create and manage customer segments based on:</p>
          <ul>
            <li>Geographic location</li>
            <li>Industry/Retailer type</li>
            <li>Purchase behavior</li>
            <li>Engagement level</li>
          </ul>

          <h3>8.3 Currency Conversion</h3>
          <p>The system supports multiple currencies:</p>
          <ul>
            <li>USD (US Dollar)</li>
            <li>HKD (Hong Kong Dollar)</li>
            <li>SGD (Singapore Dollar)</li>
            <li>AUD (Australian Dollar)</li>
            <li>CNY (Chinese Yuan)</li>
            <li>IDR (Indonesian Rupiah)</li>
            <li>MYR (Malaysian Ringgit)</li>
          </ul>
          <p>Select your preferred currency using the currency selector in the header.</p>

          <h3>8.4 Brand Management</h3>
          <p>Assign multiple brands to customers:</p>
          <ul>
            <li>Beaba</li>
            <li>Skip Hop</li>
            <li>And more...</li>
          </ul>
        </div>

        <div class="section">
          <h2>9. AI-Powered Features</h2>
          
          <h3>9.1 AI Next Best Action</h3>
          <p>Located on your dashboard, this feature analyzes your customer portfolio and suggests:</p>
          <ul>
            <li>Which customers to contact today</li>
            <li>Priority level for each recommendation</li>
            <li>Suggested action type (call, email, visit)</li>
            <li>Reasoning behind each recommendation</li>
          </ul>

          <h3>9.2 Customer AI Insights</h3>
          <p>In each customer's detail modal, access AI-generated insights including:</p>
          <ul>
            <li>Sales pattern analysis</li>
            <li>Purchasing behavior trends</li>
            <li>Engagement assessment</li>
            <li>Actionable recommendations</li>
          </ul>

          <h3>9.3 Churn Risk Indicator</h3>
          <p>Each customer has a churn risk assessment showing:</p>
          <ul>
            <li>Risk level: Low, Medium, High, or Critical</li>
            <li>Key risk factors</li>
            <li>Engagement metrics</li>
            <li>Retention recommendations</li>
          </ul>

          <h3>9.4 User Performance AI Summary</h3>
          <p>Administrators can view AI-generated performance summaries for each user, including:</p>
          <ul>
            <li>Strengths and areas for improvement</li>
            <li>Activity analysis</li>
            <li>Goal progress assessment</li>
          </ul>
        </div>

        <div class="section">
          <h2>10. Tips & Best Practices</h2>
          
          <h3>10.1 Daily Workflow</h3>
          <ol>
            <li>Start your day on the Dashboard to review priorities</li>
            <li>Check the AI Next Best Action for contact recommendations</li>
            <li>Review and complete overdue tasks</li>
            <li>Log all customer interactions promptly</li>
            <li>Update customer stages as relationships progress</li>
          </ol>

          <h3>10.2 Customer Engagement</h3>
          <ul>
            <li>Contact customers at least every 14 days to maintain relationships</li>
            <li>Use the "Days Since Last Contact" indicator to prioritize outreach</li>
            <li>Log detailed notes after each interaction</li>
            <li>Set follow-up reminders for important customers</li>
          </ul>

          <h3>10.3 Data Quality</h3>
          <ul>
            <li>Keep customer information up to date</li>
            <li>Use consistent formatting for phone numbers and addresses</li>
            <li>Assign appropriate brands and retailer types</li>
            <li>Review and update customer stages regularly</li>
          </ul>

          <h3>10.4 Keyboard Shortcuts</h3>
          <table>
            <tr><th>Shortcut</th><th>Action</th></tr>
            <tr><td>Cmd/Ctrl + K</td><td>Open Global Search</td></tr>
          </table>

          <div class="tip">
            <strong>Need Help?</strong> Contact your system administrator or manager for additional support and training.
          </div>
        </div>

        <div style="text-align: center; margin-top: 60px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280;">
          <p>Bloom & Grow Group CRM User Manual</p>
          <p>© 2025 Bloom & Grow Group. All rights reserved.</p>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <div className="flex items-center justify-between">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <Button onClick={handleDownload} data-testid="button-download-manual">
            <Download className="h-4 w-4 mr-2" />
            Download / Print Manual
          </Button>
        </div>

        <div id="manual-content" className="space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold text-primary">Bloom & Grow CRM</h1>
            <p className="text-xl text-muted-foreground">User Manual</p>
            <p className="text-sm text-muted-foreground">Version 1.0 | November 2025</p>
          </div>

          <Separator />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Table of Contents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li><a href="#getting-started" className="hover:text-primary hover:underline">Getting Started</a></li>
                <li><a href="#navigation" className="hover:text-primary hover:underline">Navigation & Layout</a></li>
                <li><a href="#dashboard" className="hover:text-primary hover:underline">Dashboard (Home)</a></li>
                <li><a href="#customers" className="hover:text-primary hover:underline">Customer Management</a></li>
                <li><a href="#sales" className="hover:text-primary hover:underline">Sales Dashboard</a></li>
                <li><a href="#analytics" className="hover:text-primary hover:underline">Analytics</a></li>
                <li><a href="#admin" className="hover:text-primary hover:underline">Admin Dashboard</a></li>
                <li><a href="#features" className="hover:text-primary hover:underline">Additional Features</a></li>
                <li><a href="#ai" className="hover:text-primary hover:underline">AI-Powered Features</a></li>
                <li><a href="#tips" className="hover:text-primary hover:underline">Tips & Best Practices</a></li>
              </ol>
            </CardContent>
          </Card>

          <Card id="getting-started">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCircle className="h-5 w-5 text-primary" />
                1. Getting Started
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">1.1 Logging In</h3>
                <ol className="list-decimal list-inside space-y-2 text-muted-foreground ml-4">
                  <li>Open the application in your web browser</li>
                  <li>Enter your username and password</li>
                  <li>Click the "Login" button</li>
                </ol>
                <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950 border-l-4 border-amber-500 rounded">
                  <p className="text-sm"><strong>Tip:</strong> Contact your administrator if you forget your password or need account access.</p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">1.2 User Roles</h3>
                <p className="text-muted-foreground mb-3">The system has different access levels based on your role:</p>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-muted">
                        <th className="border p-3 text-left">Role</th>
                        <th className="border p-3 text-left">Access Level</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr><td className="border p-3">CEO</td><td className="border p-3">Full access to all features and all regional data</td></tr>
                      <tr><td className="border p-3">Sales Director</td><td className="border p-3">Full access to team management and analytics</td></tr>
                      <tr><td className="border p-3">Regional Manager</td><td className="border p-3">Access to regional team data and analytics</td></tr>
                      <tr><td className="border p-3">Manager</td><td className="border p-3">Access to team data and reporting</td></tr>
                      <tr><td className="border p-3">Salesman</td><td className="border p-3">Access to personal customers and sales data</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card id="navigation">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                2. Navigation & Layout
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">2.1 Sidebar Navigation</h3>
                <p className="text-muted-foreground mb-3">The left sidebar provides access to all main sections:</p>
                <ul className="space-y-2 ml-4">
                  <li className="flex items-center gap-2"><Home className="h-4 w-4 text-primary" /> <strong>Home:</strong> <span className="text-muted-foreground">Your personalized dashboard with daily priorities</span></li>
                  <li className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> <strong>Customers:</strong> <span className="text-muted-foreground">Manage your customer database</span></li>
                  <li className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" /> <strong>Sales Dashboard:</strong> <span className="text-muted-foreground">View and manage sales targets</span></li>
                  <li className="flex items-center gap-2"><PieChart className="h-4 w-4 text-primary" /> <strong>Analytics:</strong> <span className="text-muted-foreground">Detailed performance metrics</span></li>
                  <li className="flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> <strong>Segments:</strong> <span className="text-muted-foreground">Customer segmentation tools</span></li>
                  <li className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> <strong>Pipeline:</strong> <span className="text-muted-foreground">Sales pipeline visualization</span></li>
                  <li className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> <strong>Admin Dashboard:</strong> <span className="text-muted-foreground">User management (managers and above)</span></li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">2.2 Header Features</h3>
                <ul className="space-y-2 ml-4 text-muted-foreground">
                  <li className="flex items-center gap-2"><Search className="h-4 w-4" /> <strong>Global Search:</strong> Use Cmd/Ctrl + K to quickly search customers, interactions, and tasks</li>
                  <li className="flex items-center gap-2"><DollarSign className="h-4 w-4" /> <strong>Currency Selector:</strong> Choose your preferred display currency</li>
                  <li className="flex items-center gap-2"><Settings className="h-4 w-4" /> <strong>Theme Toggle:</strong> Switch between light and dark modes</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">2.3 Quick Action Button</h3>
                <p className="text-muted-foreground mb-2">The floating "+" button in the bottom-right corner provides quick access to:</p>
                <ul className="list-disc list-inside space-y-1 ml-4 text-muted-foreground">
                  <li>Add new customer</li>
                  <li>Log a call</li>
                  <li>Log a visit</li>
                  <li>Record a sale</li>
                  <li>Create a task</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card id="dashboard">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5 text-primary" />
                3. Dashboard (Home)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">3.1 Today's Priorities</h3>
                <p className="text-muted-foreground mb-2">The dashboard shows important alerts at the top:</p>
                <ul className="list-disc list-inside space-y-1 ml-4 text-muted-foreground">
                  <li><strong>Overdue Tasks:</strong> Tasks that need immediate attention</li>
                  <li><strong>Today's Tasks:</strong> Tasks scheduled for today</li>
                  <li><strong>Follow-up Reminders:</strong> Customers requiring follow-up</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">3.2 KPI Cards</h3>
                <p className="text-muted-foreground mb-2">Five key performance indicators with month-over-month trends:</p>
                <ul className="list-disc list-inside space-y-1 ml-4 text-muted-foreground">
                  <li>Total Customers</li>
                  <li>Monthly Revenue</li>
                  <li>Active Leads</li>
                  <li>Conversion Rate</li>
                  <li>Tasks Completed</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">3.3 AI Next Best Action</h3>
                <p className="text-muted-foreground">AI-powered recommendations for which customers to contact today, including priority level, suggested action type, and reasoning.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">3.4 Interactive Calendar</h3>
                <p className="text-muted-foreground">Visual calendar displaying scheduled tasks and interactions, color-coded by type. Click any date to view details.</p>
              </div>
            </CardContent>
          </Card>

          <Card id="customers">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                4. Customer Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">4.1 Viewing Customers</h3>
                <p className="text-muted-foreground">The Customers page offers Grid View (card-based) and List View (table format) for viewing your data.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">4.2 Filtering Customers</h3>
                <ul className="list-disc list-inside space-y-1 ml-4 text-muted-foreground">
                  <li><strong>Search:</strong> Type to search by company name, contact, or email</li>
                  <li><strong>Country Filter:</strong> Filter by region (Hong Kong, Singapore, Australia, etc.)</li>
                  <li><strong>Stage Filter:</strong> Filter by customer stage (Lead, Prospect, Customer)</li>
                  <li><strong>At-Risk Filter:</strong> Show only customers needing attention</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">4.3 Adding a New Customer</h3>
                <ol className="list-decimal list-inside space-y-2 ml-4 text-muted-foreground">
                  <li>Click the "Add Customer" button or use the Quick Action menu</li>
                  <li>Fill in required fields: Company Name, Country, Contact Name/Email, Stage</li>
                  <li>Add optional information: Phone, Address, Retailer Type, Brands</li>
                  <li>Click "Save" to create the customer</li>
                </ol>
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 border-l-4 border-blue-500 rounded">
                  <p className="text-sm"><strong>Note:</strong> The system checks for duplicates based on company name and email to prevent duplicate entries.</p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">4.4 Customer Details</h3>
                <p className="text-muted-foreground mb-2">Click on any customer to open their detail modal with tabs:</p>
                <ul className="list-disc list-inside space-y-1 ml-4 text-muted-foreground">
                  <li><strong>Overview:</strong> Basic company information and contacts</li>
                  <li><strong>Interactions:</strong> History of calls, visits, and notes</li>
                  <li><strong>Sales:</strong> Sales history and targets</li>
                  <li><strong>Addresses:</strong> Multiple address management</li>
                  <li><strong>AI Insights:</strong> AI-generated analysis and recommendations</li>
                  <li><strong>Churn Risk:</strong> Risk assessment with factors and recommendations</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">4.5 Days Since Last Contact</h3>
                <div className="flex flex-wrap gap-2 ml-4">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-sm">Green: Recently contacted (0-7 days)</span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-sm">Yellow: Needs attention (7-14 days)</span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-sm">Red: Overdue (14+ days)</span>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">4.6 Bulk Import</h3>
                <ol className="list-decimal list-inside space-y-2 ml-4 text-muted-foreground">
                  <li>Click the "Import" button</li>
                  <li>Download the Excel template</li>
                  <li>Fill in your customer data following the template format</li>
                  <li>Upload the completed file</li>
                  <li>Review and confirm the import</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          <Card id="sales">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                5. Sales Dashboard
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">5.1 Monthly Targets</h3>
                <p className="text-muted-foreground">View and manage personal and team sales targets with progress tracking and visual indicators.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">5.2 Budget vs. Actuals</h3>
                <p className="text-muted-foreground mb-2">The dashboard shows:</p>
                <ul className="list-disc list-inside space-y-1 ml-4 text-muted-foreground">
                  <li>Target amount for the period</li>
                  <li>Actual sales achieved</li>
                  <li>Variance (over/under target)</li>
                  <li>Progress percentage</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">5.3 Export Reports</h3>
                <p className="text-muted-foreground">Click the "Export" button to download sales reports in Excel format.</p>
              </div>
            </CardContent>
          </Card>

          <Card id="analytics">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-primary" />
                6. Analytics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">6.1 Performance Metrics</h3>
                <ul className="list-disc list-inside space-y-1 ml-4 text-muted-foreground">
                  <li>Sales by region</li>
                  <li>Customer acquisition trends</li>
                  <li>Conversion rates</li>
                  <li>Revenue breakdowns</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">6.2 Team Performance</h3>
                <p className="text-muted-foreground">Managers can view individual team member performance, team totals, averages, and rankings.</p>
              </div>
            </CardContent>
          </Card>

          <Card id="admin">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                7. Admin Dashboard
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm text-muted-foreground italic">Available to Managers and above</p>

              <div>
                <h3 className="text-lg font-semibold mb-3">7.1 User Management</h3>
                <ul className="list-disc list-inside space-y-1 ml-4 text-muted-foreground">
                  <li>View all users in the system</li>
                  <li>Filter by role, region, or status</li>
                  <li>Edit user details and assignments</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">7.2 Team Structure</h3>
                <p className="text-muted-foreground">Visualize the organizational hierarchy and reporting relationships.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">7.3 Regional Leaderboard</h3>
                <p className="text-muted-foreground">View top-performing salespeople by region.</p>
              </div>
            </CardContent>
          </Card>

          <Card id="features">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                8. Additional Features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">8.1 Pipeline View</h3>
                <p className="text-muted-foreground mb-2">Visual pipeline showing customers by stage with weighted values:</p>
                <ul className="list-disc list-inside space-y-1 ml-4 text-muted-foreground">
                  <li>Leads: 20% weighting</li>
                  <li>Prospects: 50% weighting</li>
                  <li>Customers: 100% weighting</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">8.2 Currency Support</h3>
                <p className="text-muted-foreground mb-2">The system supports multiple currencies:</p>
                <div className="flex flex-wrap gap-2 ml-4">
                  <span className="px-2 py-1 rounded bg-muted text-sm">USD</span>
                  <span className="px-2 py-1 rounded bg-muted text-sm">HKD</span>
                  <span className="px-2 py-1 rounded bg-muted text-sm">SGD</span>
                  <span className="px-2 py-1 rounded bg-muted text-sm">AUD</span>
                  <span className="px-2 py-1 rounded bg-muted text-sm">CNY</span>
                  <span className="px-2 py-1 rounded bg-muted text-sm">IDR</span>
                  <span className="px-2 py-1 rounded bg-muted text-sm">MYR</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card id="ai">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                9. AI-Powered Features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">9.1 AI Next Best Action</h3>
                <p className="text-muted-foreground">Located on your dashboard, this feature analyzes your customer portfolio and suggests which customers to contact, with priority levels, action types, and reasoning.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">9.2 Customer AI Insights</h3>
                <p className="text-muted-foreground">In each customer's detail modal, access AI-generated insights including sales patterns, purchasing trends, engagement assessment, and recommendations.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">9.3 Churn Risk Indicator</h3>
                <p className="text-muted-foreground mb-2">Each customer has a churn risk assessment showing:</p>
                <div className="flex flex-wrap gap-2 ml-4">
                  <span className="px-2 py-1 rounded bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-sm">Low Risk</span>
                  <span className="px-2 py-1 rounded bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-sm">Medium Risk</span>
                  <span className="px-2 py-1 rounded bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 text-sm">High Risk</span>
                  <span className="px-2 py-1 rounded bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-sm">Critical Risk</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card id="tips">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-primary" />
                10. Tips & Best Practices
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">10.1 Daily Workflow</h3>
                <ol className="list-decimal list-inside space-y-2 ml-4 text-muted-foreground">
                  <li>Start your day on the Dashboard to review priorities</li>
                  <li>Check the AI Next Best Action for contact recommendations</li>
                  <li>Review and complete overdue tasks</li>
                  <li>Log all customer interactions promptly</li>
                  <li>Update customer stages as relationships progress</li>
                </ol>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">10.2 Customer Engagement</h3>
                <ul className="list-disc list-inside space-y-1 ml-4 text-muted-foreground">
                  <li>Contact customers at least every 14 days to maintain relationships</li>
                  <li>Use the "Days Since Last Contact" indicator to prioritize outreach</li>
                  <li>Log detailed notes after each interaction</li>
                  <li>Set follow-up reminders for important customers</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">10.3 Keyboard Shortcuts</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-muted">
                        <th className="border p-3 text-left">Shortcut</th>
                        <th className="border p-3 text-left">Action</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr><td className="border p-3 font-mono">Cmd/Ctrl + K</td><td className="border p-3">Open Global Search</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-950 border-l-4 border-amber-500 rounded">
                <p className="text-sm"><strong>Need Help?</strong> Contact your system administrator or manager for additional support and training.</p>
              </div>
            </CardContent>
          </Card>

          <div className="text-center py-8 text-muted-foreground">
            <p>Bloom & Grow Group CRM User Manual</p>
            <p className="text-sm">© 2025 Bloom & Grow Group. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
