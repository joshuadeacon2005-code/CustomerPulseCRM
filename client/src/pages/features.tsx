import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";

export default function FeaturesPage() {
  const handleDownload = () => {
    const wordContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>Bloom & Grow CRM - Features & Selling Points</title>
        <style>
          body {
            font-family: Calibri, Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.5;
            color: #333;
            margin: 1in;
          }
          h1 {
            color: #f97316;
            font-size: 24pt;
            text-align: center;
            border-bottom: 3px solid #f97316;
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
          h2 {
            color: #0d9488;
            font-size: 16pt;
            margin-top: 24px;
            margin-bottom: 12px;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 6px;
          }
          h3 {
            color: #374151;
            font-size: 13pt;
            margin-top: 16px;
            margin-bottom: 8px;
          }
          ul {
            margin-left: 20px;
            margin-bottom: 12px;
          }
          li {
            margin-bottom: 6px;
          }
          .highlight {
            background-color: #fef3c7;
            padding: 2px 6px;
            border-radius: 3px;
          }
          .section {
            margin-bottom: 20px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 16px 0;
          }
          th, td {
            border: 1px solid #e5e7eb;
            padding: 8px 12px;
            text-align: left;
          }
          th {
            background-color: #f3f4f6;
            font-weight: bold;
          }
          .selling-point {
            background-color: #ecfdf5;
            border-left: 4px solid #10b981;
            padding: 12px 16px;
            margin: 12px 0;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 10pt;
          }
        </style>
      </head>
      <body>
        <h1>Bloom & Grow CRM</h1>
        <p style="text-align: center; color: #6b7280; font-size: 14pt;">Features & Selling Points</p>
        <p style="text-align: center; color: #6b7280;">Version 1.0 | November 2025</p>

        <h2>Core CRM Features</h2>

        <h3>Customer Management</h3>
        <ul>
          <li>Complete customer profiles with company info, contacts, and addresses</li>
          <li>Multi-contact support per customer (primary + additional contacts)</li>
          <li>Customer stage tracking (Lead → Prospect → Customer)</li>
          <li>Multi-country support (Hong Kong, Singapore, Australia, New Zealand, Macau, Indonesia)</li>
          <li>Retailer type classification (Department Store, Baby/Nursery, Online Only, Corporate, etc.)</li>
          <li>Brand assignment (multi-brand per customer)</li>
          <li>Duplicate detection by company name and email to prevent data redundancy</li>
          <li>Grid and List view options for customer browsing</li>
          <li>Advanced filtering by country, stage, and at-risk status</li>
          <li>Global search (Cmd/Ctrl + K) across customers, interactions, and tasks</li>
        </ul>

        <h3>Contact & Interaction Tracking</h3>
        <ul>
          <li>Log calls, visits, emails, notes, and follow-ups</li>
          <li>"Days Since Last Contact" indicator with color-coded alerts</li>
          <li>At-risk customer flagging (14+ days without contact)</li>
          <li>Interaction history per customer</li>
          <li>Follow-up reminders and scheduling</li>
        </ul>

        <h3>Sales Management</h3>
        <ul>
          <li>Monthly sales recording per customer</li>
          <li>Personal and team sales targets</li>
          <li>Budget vs. Actuals reporting with variance analysis</li>
          <li>Sales pipeline visualization with weighted values:
            <ul>
              <li>Leads: 20% weighting</li>
              <li>Prospects: 50% weighting</li>
              <li>Customers: 100% weighting</li>
            </ul>
          </li>
          <li>Quarterly soft targets per customer</li>
        </ul>

        <h2>Multi-Currency Support</h2>
        <ul>
          <li>7 supported currencies: USD, HKD, SGD, AUD, CNY, IDR, MYR</li>
          <li>49 pre-seeded exchange rate pairs</li>
          <li>User-selectable display currency</li>
          <li>Dual storage (original + base currency) for accuracy</li>
        </ul>

        <h2>Role-Based Access Control</h2>
        <p>5 user roles with hierarchical permissions:</p>
        <table>
          <tr>
            <th>Role</th>
            <th>Access Level</th>
          </tr>
          <tr>
            <td><strong>CEO</strong></td>
            <td>Full access to all regions and features</td>
          </tr>
          <tr>
            <td><strong>Sales Director</strong></td>
            <td>Team management and full analytics</td>
          </tr>
          <tr>
            <td><strong>Regional Manager</strong></td>
            <td>Regional team oversight</td>
          </tr>
          <tr>
            <td><strong>Manager</strong></td>
            <td>Team data and reporting</td>
          </tr>
          <tr>
            <td><strong>Salesman</strong></td>
            <td>Personal customers and sales only</td>
          </tr>
        </table>
        <ul>
          <li>Team hierarchy with manager assignments</li>
          <li>Regional office assignments (Hong Kong, Australia/NZ, Singapore)</li>
        </ul>

        <h2>AI-Powered Features</h2>
        <ul>
          <li><strong>AI Next Best Action:</strong> Daily recommendations on which customers to contact with priority scoring and reasoning</li>
          <li><strong>Customer AI Insights:</strong> Sales pattern analysis, purchasing trends, and actionable recommendations</li>
          <li><strong>Churn Risk Indicator:</strong> Risk assessment (Low/Medium/High/Critical) with risk factors and retention strategies</li>
          <li><strong>User Performance AI Summary:</strong> Comprehensive performance analysis for managers</li>
          <li><strong>Interaction Note Summarization:</strong> AI-powered summary of customer interactions</li>
          <li><strong>Sales Forecasting:</strong> Predictive analytics for future sales</li>
        </ul>

        <h2>Dashboard & Analytics</h2>

        <h3>Home Dashboard</h3>
        <ul>
          <li>Today's Priorities banners (overdue tasks, today's tasks, follow-ups)</li>
          <li>5 KPI cards with month-over-month trends</li>
          <li>At-Risk Customers widget</li>
          <li>Team Performance Summary (for managers)</li>
          <li>Interactive calendar with color-coded tasks and interactions</li>
          <li>Quick Action floating button (+) for common tasks</li>
        </ul>

        <h3>Analytics Dashboard</h3>
        <ul>
          <li>Sales by region</li>
          <li>Customer acquisition trends</li>
          <li>Conversion rates</li>
          <li>Revenue breakdowns</li>
          <li>Month selector for historical comparisons</li>
          <li>Team structure visualization</li>
        </ul>

        <h3>Admin Dashboard (Managers+)</h3>
        <ul>
          <li>User management with filtering and bulk selection</li>
          <li>Regional leaderboard for top performers</li>
          <li>Team hierarchy visualization</li>
          <li>User performance details with AI summaries</li>
        </ul>

        <h2>Productivity Features</h2>
        <ul>
          <li>Quick Action Menu for rapid task creation</li>
          <li>Global Search (Cmd/Ctrl + K)</li>
          <li>Bulk customer import from Excel with:
            <ul>
              <li>Downloadable template</li>
              <li>Flexible column mapping</li>
              <li>Duplicate detection</li>
              <li>Detailed error tracking</li>
            </ul>
          </li>
          <li>Export to Excel for sales reports</li>
          <li>Task management system</li>
          <li>Light/Dark theme toggle</li>
        </ul>

        <h2>Data Organization</h2>
        <ul>
          <li>Customer segmentation tools</li>
          <li>Multi-address support per customer</li>
          <li>Structured address fields with CRUD operations</li>
          <li>Brand management (many-to-many relationships)</li>
          <li>Comparative analytics across time periods</li>
        </ul>

        <h2>Top 10 Selling Points</h2>

        <div class="selling-point">
          <strong>1. Built for Sales Teams</strong><br/>
          Designed specifically for B2B sales with customer journey tracking from lead to customer
        </div>

        <div class="selling-point">
          <strong>2. AI-Powered Intelligence</strong><br/>
          Smart recommendations, churn prediction, and performance insights save time and improve outcomes
        </div>

        <div class="selling-point">
          <strong>3. Multi-Region Ready</strong><br/>
          Support for APAC countries with multi-currency handling for international operations
        </div>

        <div class="selling-point">
          <strong>4. Role-Based Security</strong><br/>
          Flexible permissions ensure salespeople see their data while managers get full team visibility
        </div>

        <div class="selling-point">
          <strong>5. Activity Tracking</strong><br/>
          Never miss a follow-up with days-since-contact alerts and at-risk customer flagging
        </div>

        <div class="selling-point">
          <strong>6. Pipeline Visibility</strong><br/>
          Weighted pipeline metrics give accurate revenue forecasting
        </div>

        <div class="selling-point">
          <strong>7. Bulk Operations</strong><br/>
          Import customers from Excel, export reports for stakeholders
        </div>

        <div class="selling-point">
          <strong>8. Modern UI/UX</strong><br/>
          Clean, professional interface with light/dark modes and keyboard shortcuts
        </div>

        <div class="selling-point">
          <strong>9. Real-Time Analytics</strong><br/>
          Dashboard KPIs with trends, budget vs. actuals, and team performance comparisons
        </div>

        <div class="selling-point">
          <strong>10. Integrated Help</strong><br/>
          Built-in downloadable user manual for easy onboarding
        </div>

        <div class="footer">
          <p>Bloom & Grow Group CRM</p>
          <p>&copy; 2025 Bloom & Grow Group. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([wordContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Bloom_Grow_CRM_Features.doc';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const features = [
    {
      category: "Customer Management",
      items: [
        "Complete customer profiles with company info, contacts, and addresses",
        "Multi-contact support per customer",
        "Customer stage tracking (Lead → Prospect → Customer)",
        "Multi-country support (HK, SG, AU, NZ, Macau, Indonesia)",
        "Duplicate detection by company name and email",
        "Grid and List view options",
        "Advanced filtering and global search"
      ]
    },
    {
      category: "Sales Management",
      items: [
        "Monthly sales recording per customer",
        "Personal and team sales targets",
        "Budget vs. Actuals reporting",
        "Sales pipeline with weighted values",
        "Export to Excel"
      ]
    },
    {
      category: "AI-Powered Features",
      items: [
        "AI Next Best Action recommendations",
        "Customer AI Insights",
        "Churn Risk Indicator",
        "User Performance AI Summary",
        "Sales Forecasting"
      ]
    },
    {
      category: "Multi-Currency",
      items: [
        "7 currencies: USD, HKD, SGD, AUD, CNY, IDR, MYR",
        "49 exchange rate pairs",
        "User-selectable display currency"
      ]
    },
    {
      category: "Role-Based Access",
      items: [
        "CEO, Sales Director, Regional Manager, Manager, Salesman",
        "Team hierarchy with manager assignments",
        "Regional office assignments"
      ]
    },
    {
      category: "Productivity",
      items: [
        "Quick Action Menu",
        "Global Search (Cmd/Ctrl + K)",
        "Bulk Excel import with templates",
        "Task management",
        "Light/Dark theme"
      ]
    }
  ];

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
          <Button onClick={handleDownload} data-testid="button-download-features">
            <Download className="h-4 w-4 mr-2" />
            Download as Word Document
          </Button>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-primary">Bloom & Grow CRM</h1>
          <p className="text-xl text-muted-foreground">Features & Selling Points</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {features.map((section, idx) => (
            <Card key={idx}>
              <CardHeader>
                <CardTitle className="text-lg">{section.category}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {section.items.map((item, itemIdx) => (
                    <li key={itemIdx} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle>Top 10 Selling Points</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {[
                "Built for Sales Teams - B2B customer journey tracking",
                "AI-Powered Intelligence - Smart recommendations & churn prediction",
                "Multi-Region Ready - APAC countries with multi-currency",
                "Role-Based Security - Flexible permissions for teams",
                "Activity Tracking - Days-since-contact alerts",
                "Pipeline Visibility - Weighted revenue forecasting",
                "Bulk Operations - Excel import/export",
                "Modern UI/UX - Light/dark modes, keyboard shortcuts",
                "Real-Time Analytics - KPIs with trends",
                "Integrated Help - Built-in user manual"
              ].map((point, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-muted-foreground">{point}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <div className="text-center py-4 text-muted-foreground text-sm">
          <p>Bloom & Grow Group CRM</p>
          <p>© 2025 Bloom & Grow Group. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
