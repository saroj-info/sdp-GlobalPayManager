import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigation } from "@/components/layout/navigation";
import { ArrowLeft, Globe, FileText, Users, Building2, Clock, DollarSign, Shield, AlertCircle } from "lucide-react";
import { Link } from "wouter";

const COUNTRIES = [
  {
    id: "australia",
    name: "Australia",
    flag: "🇦🇺",
    currency: "AUD",
    minWage: "A$23.23/hour",
    workingHours: "38 hours/week",
    funFact: "Australia has one of the highest minimum wages in the world and was the first country to introduce the 8-hour working day in 1856, inspiring the global labor movement.",
    image: (
      <svg viewBox="0 0 400 300" className="w-full h-48 rounded-lg">
        <defs>
          <linearGradient id="ausskyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#87CEEB" />
            <stop offset="100%" stopColor="#E0F6FF" />
          </linearGradient>
        </defs>
        <rect width="400" height="300" fill="url(#ausskyGrad)" />
        <circle cx="60" cy="60" r="25" fill="#FFD700" />
        <path d="M150 250 Q200 200 250 250 Q300 200 350 250 L350 300 L150 300 Z" fill="#FF6B35" />
        <rect x="50" y="200" width="80" height="100" fill="#8B4513" />
        <rect x="60" y="180" width="60" height="20" fill="#654321" />
        <circle cx="320" cy="180" r="15" fill="#808080" />
        <circle cx="300" cy="190" r="12" fill="#A0A0A0" />
        <path d="M200 280 L220 260 L240 280 L200 280" fill="#228B22" />
        <path d="M180 285 L200 265 L220 285 L180 285" fill="#32CD32" />
      </svg>
    ),
    guide: {
      overview: "Australia has one of the most comprehensive employment law frameworks globally, governed by the Fair Work Act 2009. The system balances flexibility with strong worker protections through modern awards, enterprise agreements, and the National Employment Standards.",
      
      keyLaws: [
        "Fair Work Act 2009 - Primary employment legislation",
        "Work Health and Safety Act 2011 - Workplace safety requirements", 
        "Age Discrimination Act 2004 - Protects against age-based discrimination",
        "Disability Discrimination Act 1992 - Ensures equal employment opportunities",
        "Sex Discrimination Act 1984 - Prohibits gender-based discrimination"
      ],
      
      employmentTypes: [
        {
          type: "Permanent Full-time",
          description: "Standard employment with ongoing entitlements, typically 38 hours per week"
        },
        {
          type: "Permanent Part-time", 
          description: "Regular ongoing employment with pro-rata entitlements, fewer than 38 hours"
        },
        {
          type: "Casual",
          description: "No guaranteed hours, 25% casual loading in lieu of leave entitlements"
        },
        {
          type: "Fixed-term Contract",
          description: "Employment for a specific period or project with defined end date"
        }
      ],
      
      mandatoryBenefits: [
        "Superannuation - 11.5% employer contribution (increasing to 12% by 2025)",
        "Annual Leave - 4 weeks paid leave per year",
        "Personal/Carer's Leave - 10 days per year (cumulative)",
        "Long Service Leave - Varies by state (typically 8.67-13 weeks after 10-15 years)",
        "Public Holidays - 10 national holidays plus state-specific days",
        "Parental Leave - 12 months unpaid leave (plus government parental pay)",
        "Redundancy Pay - Based on years of service for eligible employees"
      ],
      
      payrollTax: {
        threshold: "Varies by state (A$650,000 - A$2.2M)",
        rates: "4.0% - 6.85% depending on state and payroll amount",
        notes: "Calculated on annual Australian taxable wages across all states"
      },
      
      workersComp: {
        required: "Yes - mandatory for all employees",
        rates: "0.5% - 15% of wages depending on industry classification",
        provider: "State-based schemes (WorkCover, WorkSafe, etc.)"
      },
      
      compliance: [
        "Single Touch Payroll (STP) reporting required for all employers",
        "Modern Award or Enterprise Agreement compliance mandatory",
        "Work Health and Safety policies and training required",
        "Anti-discrimination and harassment policies required",
        "Workplace injury reporting within specified timeframes"
      ],
      
      termination: {
        notice: "1-5 weeks depending on length of service and age",
        severance: "Redundancy pay if position eliminated (2-16 weeks pay)",
        unfairDismissal: "Protection against unfair dismissal after 6 months employment"
      }
    }
  },
  {
    id: "usa",
    name: "United States",
    flag: "🇺🇸", 
    currency: "USD",
    minWage: "$7.25/hour (federal minimum)",
    workingHours: "40 hours/week (overtime after 40)",
    funFact: "The US has over 180 different minimum wage rates across federal, state, and local jurisdictions. Some cities like Seattle have minimum wages exceeding $18/hour.",
    image: (
      <svg viewBox="0 0 400 300" className="w-full h-48 rounded-lg">
        <defs>
          <linearGradient id="usskyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4682B4" />
            <stop offset="100%" stopColor="#B0E0E6" />
          </linearGradient>
        </defs>
        <rect width="400" height="300" fill="url(#usskyGrad)" />
        <rect x="50" y="150" width="60" height="150" fill="#C0C0C0" />
        <rect x="120" y="120" width="80" height="180" fill="#A9A9A9" />
        <rect x="210" y="100" width="70" height="200" fill="#808080" />
        <rect x="290" y="130" width="60" height="170" fill="#696969" />
        <rect x="55" y="140" width="10" height="10" fill="#FFD700" />
        <rect x="75" y="155" width="10" height="10" fill="#FFD700" />
        <rect x="95" y="170" width="10" height="10" fill="#FFD700" />
        <rect x="130" y="110" width="15" height="15" fill="#FFD700" />
        <rect x="160" y="125" width="15" height="15" fill="#FFD700" />
        <rect x="220" y="90" width="12" height="12" fill="#FFD700" />
        <rect x="250" y="105" width="12" height="12" fill="#FFD700" />
        <circle cx="350" cy="50" r="20" fill="#FFD700" />
      </svg>
    ),
    guide: {
      overview: "The US operates on an at-will employment system with federal baseline protections and state-specific variations. Employment law is complex due to federal, state, and local jurisdictions, requiring careful compliance across multiple levels.",
      
      keyLaws: [
        "Fair Labor Standards Act (FLSA) - Wages, hours, and overtime",
        "Title VII Civil Rights Act - Prohibits discrimination",
        "Americans with Disabilities Act (ADA) - Disability accommodations", 
        "Family and Medical Leave Act (FMLA) - Unpaid family/medical leave",
        "Worker Adjustment and Retraining Notification (WARN) Act - Mass layoff notice"
      ],
      
      employmentTypes: [
        {
          type: "At-Will Employment",
          description: "Standard employment relationship, terminable by either party without cause"
        },
        {
          type: "Contract Employment",
          description: "Fixed-term agreements with specific terms and conditions"
        },
        {
          type: "Independent Contractor",
          description: "1099 classification with no employment benefits or protections"
        }
      ],
      
      mandatoryBenefits: [
        "Social Security - 6.2% employer contribution (on wages up to $160,200 in 2023)",
        "Medicare - 1.45% employer contribution (no wage cap)",
        "Federal Unemployment Tax (FUTA) - 0.6% on first $7,000 of wages",
        "State Unemployment Insurance - Varies by state (0.5% - 6%+)",
        "Workers' Compensation - Required in most states, rates vary by industry",
        "Family and Medical Leave - Unpaid leave for eligible employees (50+ employee companies)"
      ],
      
      payrollTax: {
        threshold: "No threshold - applies to all wages",
        rates: "7.65% (6.2% Social Security + 1.45% Medicare)",
        notes: "Additional 0.9% Medicare tax on high earners. State taxes vary significantly."
      },
      
      workersComp: {
        required: "Required in 49 states (Texas is exception)",
        rates: "0.75% - 4%+ of wages depending on industry risk classification",
        provider: "State funds, private insurers, or self-insurance"
      },
      
      compliance: [
        "Form I-9 employment eligibility verification for all employees",
        "Equal Employment Opportunity (EEO) poster display required",
        "State-specific wage and hour law compliance",
        "Workplace safety (OSHA) standards and reporting",
        "State unemployment insurance registration and reporting"
      ],
      
      termination: {
        notice: "Not required for at-will employment (unless contractually specified)",
        severance: "Not legally required (unless contractually specified)",
        unfairDismissal: "Limited protections - primarily discrimination-based claims"
      }
    }
  },
  {
    id: "new-zealand",
    name: "New Zealand", 
    flag: "🇳🇿",
    currency: "NZD",
    minWage: "NZ$22.70/hour",
    workingHours: "40 hours/week",
    funFact: "New Zealand was the first country in the world to give women the right to vote (1893) and has consistently ranked among the top countries for work-life balance and employee rights.",
    image: (
      <svg viewBox="0 0 400 300" className="w-full h-48 rounded-lg">
        <defs>
          <linearGradient id="nzskyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#87CEEB" />
            <stop offset="100%" stopColor="#E0F6FF" />
          </linearGradient>
        </defs>
        <rect width="400" height="300" fill="url(#nzskyGrad)" />
        <path d="M0 200 Q100 180 200 200 Q300 180 400 200 L400 300 L0 300 Z" fill="#228B22" />
        <path d="M50 180 Q100 160 150 180 Q200 160 250 180 Q300 160 350 180 L350 220 L50 220 Z" fill="#32CD32" />
        <circle cx="80" cy="120" r="40" fill="#006400" />
        <circle cx="200" cy="100" r="35" fill="#228B22" />
        <circle cx="320" cy="140" r="30" fill="#32CD32" />
        <rect x="75" y="80" width="10" height="80" fill="#8B4513" />
        <rect x="195" y="65" width="10" height="70" fill="#654321" />
        <rect x="315" y="110" width="10" height="60" fill="#8B4513" />
        <path d="M150 250 L180 220 L210 250 L150 250" fill="#FF6B35" />
        <path d="M250 270 L280 240 L310 270 L250 270" fill="#FF4500" />
        <circle cx="350" cy="50" r="20" fill="#FFD700" />
      </svg>
    ),
    guide: {
      overview: "New Zealand's employment law emphasizes good faith relationships between employers and employees. The Employment Relations Act 2000 provides a framework that balances flexibility with protection, requiring genuine consultation and fair treatment.",
      
      keyLaws: [
        "Employment Relations Act 2000 - Primary employment legislation",
        "Health and Safety at Work Act 2015 - Workplace safety requirements",
        "Human Rights Act 1993 - Anti-discrimination protections",
        "Holidays Act 2003 - Leave entitlements and public holidays",
        "Minimum Wage Act 1983 - Minimum wage requirements"
      ],
      
      employmentTypes: [
        {
          type: "Permanent Employment",
          description: "Ongoing employment with full entitlements and job security protections"
        },
        {
          type: "Fixed-term Employment",
          description: "Employment for specific period or project with genuine reasons required"
        },
        {
          type: "Casual Employment", 
          description: "No guaranteed hours, employed as needed with 8% holiday pay"
        }
      ],
      
      mandatoryBenefits: [
        "KiwiSaver - 3% employer contribution (if employee enrolled)",
        "Annual Holidays - 4 weeks paid leave after 12 months service",
        "Public Holidays - 11 national public holidays (paid at time-and-a-half if worked)",
        "Sick Leave - 10 days per year after 6 months employment",
        "Bereavement Leave - 3 days paid leave for immediate family",
        "Parental Leave - 26 weeks paid leave (government-funded) plus unpaid options",
        "ACC Coverage - Accident compensation coverage for all employees"
      ],
      
      payrollTax: {
        threshold: "No payroll tax in New Zealand",
        rates: "N/A",
        notes: "PAYE (Pay As You Earn) income tax deducted from employee wages"
      },
      
      workersComp: {
        required: "ACC (Accident Compensation Corporation) covers all employees",
        rates: "Approximately 1.4% of liable earnings (varies by industry)",
        provider: "Government-administered ACC scheme"
      },
      
      compliance: [
        "Employment agreement required for all employees",
        "Good faith obligations in all employment relationships", 
        "Health and safety due diligence requirements for officers",
        "PAYE and employer monthly schedule filing",
        "ACC employer levy registration and payment"
      ],
      
      termination: {
        notice: "As specified in employment agreement (minimum reasonable notice)",
        severance: "Not required unless contractually specified",
        unfairDismissal: "Strong protections - justified reason and fair process required"
      }
    }
  },
  {
    id: "ireland",
    name: "Ireland",
    flag: "🇮🇪",
    currency: "EUR", 
    minWage: "€11.30/hour",
    workingHours: "39 hours/week (EU Working Time Directive applies)",
    funFact: "Ireland is home to the European headquarters of major tech companies like Google, Facebook, and Apple, earning Dublin the nickname 'Silicon Docks'. The country offers attractive corporate tax rates for international businesses.",
    image: (
      <svg viewBox="0 0 400 300" className="w-full h-48 rounded-lg">
        <defs>
          <linearGradient id="ireskyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4682B4" />
            <stop offset="100%" stopColor="#87CEEB" />
          </linearGradient>
        </defs>
        <rect width="400" height="300" fill="url(#ireskyGrad)" />
        <path d="M0 180 Q100 160 200 180 Q300 160 400 180 L400 300 L0 300 Z" fill="#228B22" />
        <circle cx="100" cy="80" r="50" fill="#006400" />
        <circle cx="250" cy="100" r="40" fill="#228B22" />
        <circle cx="350" cy="90" r="35" fill="#32CD32" />
        <rect x="95" y="30" width="10" height="100" fill="#8B4513" />
        <rect x="245" y="60" width="10" height="80" fill="#654321" />
        <rect x="345" y="55" width="10" height="70" fill="#8B4513" />
        <path d="M50 200 L100 150 L150 200 L50 200" fill="#FF6B35" />
        <path d="M200 220 L250 170 L300 220 L200 220" fill="#FF4500" />
        <rect x="150" y="180" width="40" height="60" fill="#8B4513" />
        <rect x="160" y="170" width="20" height="10" fill="#654321" />
        <rect x="165" y="190" width="10" height="15" fill="#4169E1" />
        <circle cx="50" cy="50" r="15" fill="#FFD700" />
      </svg>
    ),
    guide: {
      overview: "Irish employment law is influenced by both national legislation and EU directives, providing comprehensive worker protections. The system emphasizes written contracts, fair procedures, and strong anti-discrimination measures.",
      
      keyLaws: [
        "Employment Equality Act 2015 - Anti-discrimination legislation",
        "Unfair Dismissals Act 1977 - Protection against unfair dismissal",
        "Organisation of Working Time Act 1997 - Working hours and rest periods",
        "Payment of Wages Act 1991 - Wage protection and deductions",
        "Safety, Health and Welfare at Work Act 2005 - Workplace safety"
      ],
      
      employmentTypes: [
        {
          type: "Permanent Employment",
          description: "Indefinite contract with full statutory and contractual entitlements"
        },
        {
          type: "Fixed-term Contract",
          description: "Maximum 4 years cumulative fixed-term contracts before permanent rights"
        },
        {
          type: "Part-time Employment",
          description: "Pro-rata entitlements with protection against less favorable treatment"
        }
      ],
      
      mandatoryBenefits: [
        "PRSI (Pay Related Social Insurance) - 11.05% employer contribution",
        "Annual Leave - 4 weeks statutory minimum per year",
        "Public Holidays - 9 public holidays with premium pay if worked",
        "Sick Pay - Statutory sick pay scheme (employer supplements common)",
        "Maternity Leave - 26 weeks with 6 weeks additional unpaid leave",
        "Paternity Leave - 2 weeks paid leave for fathers/partners",
        "Redundancy - Statutory redundancy payment for eligible employees"
      ],
      
      payrollTax: {
        threshold: "No payroll tax - income tax via PAYE system",
        rates: "PAYE: 20% up to €40,000, 40% above. Plus USC and PRSI",
        notes: "Employer PRSI at 11.05% on all earnings over €352/week"
      },
      
      workersComp: {
        required: "Employer's liability insurance mandatory",
        rates: "Varies by industry risk and claims history",
        provider: "Private insurance companies"
      },
      
      compliance: [
        "Written statement of terms within 5 days (Contract of Employment Act)",
        "Revenue online services (ROS) for PAYE/PRSI reporting",
        "Workplace Relations Commission compliance",
        "Safety statement and risk assessments required",
        "Data protection compliance under GDPR"
      ],
      
      termination: {
        notice: "Minimum 1 week to 8 weeks depending on service length",
        severance: "Statutory redundancy: 2 weeks pay per year + 1 week bonus",
        unfairDismissal: "Strong protections after 12 months service"
      }
    }
  },
  {
    id: "philippines",
    name: "Philippines",
    flag: "🇵🇭",
    currency: "PHP",
    minWage: "₱537-₱610/day (varies by region)",
    workingHours: "8 hours/day, 48 hours/week",
    funFact: "The Philippines is the world's leading destination for Business Process Outsourcing (BPO), handling over 1.3 million jobs. Filipino workers are known for their excellent English skills and strong work ethic.",
    image: (
      <svg viewBox="0 0 400 300" className="w-full h-48 rounded-lg">
        <defs>
          <linearGradient id="phskyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#00BFFF" />
            <stop offset="100%" stopColor="#87CEEB" />
          </linearGradient>
        </defs>
        <rect width="400" height="300" fill="url(#phskyGrad)" />
        <path d="M0 200 Q200 180 400 200 L400 300 L0 300 Z" fill="#4169E1" />
        <circle cx="80" cy="170" r="15" fill="#00FF7F" />
        <circle cx="120" cy="175" r="12" fill="#32CD32" />
        <circle cx="160" cy="170" r="10" fill="#228B22" />
        <circle cx="200" cy="175" r="8" fill="#006400" />
        <circle cx="240" cy="170" r="15" fill="#00FF7F" />
        <circle cx="280" cy="175" r="12" fill="#32CD32" />
        <circle cx="320" cy="170" r="10" fill="#228B22" />
        <path d="M60 150 L100 120 L140 150 L60 150" fill="#FF6B35" />
        <path d="M180 160 L220 130 L260 160 L180 160" fill="#FF4500" />
        <path d="M300 155 L340 125 L380 155 L300 155" fill="#FF6B35" />
        <rect x="95" y="100" width="10" height="50" fill="#654321" />
        <rect x="215" y="110" width="10" height="50" fill="#8B4513" />
        <rect x="335" y="105" width="10" height="50" fill="#654321" />
        <circle cx="350" cy="40" r="20" fill="#FFD700" />
        <path d="M50 220 Q100 210 150 220 Q200 210 250 220 Q300 210 350 220 L350 240 L50 240 Z" fill="#FFE4B5" />
      </svg>
    ),
    guide: {
      overview: "The Philippines Labor Code provides comprehensive worker protections with mandatory benefits and strict termination procedures. The system emphasizes social protection through government programs and strong job security provisions.",
      
      keyLaws: [
        "Labor Code of the Philippines (Presidential Decree 442) - Primary employment law",
        "Social Security Act - SSS coverage and benefits",
        "National Health Insurance Act - PhilHealth coverage",
        "Migrant Workers Act - Protection for overseas workers",
        "Anti-Sexual Harassment Act - Workplace harassment prevention"
      ],
      
      employmentTypes: [
        {
          type: "Regular Employment",
          description: "Permanent employment with full benefits and security of tenure"
        },
        {
          type: "Probationary Employment",
          description: "6-month trial period (except skilled positions - 3 months)"
        },
        {
          type: "Project Employment",
          description: "Employment for specific project or undertaking with defined duration"
        },
        {
          type: "Seasonal Employment",
          description: "Work during specific seasons with advance notice of start/end"
        }
      ],
      
      mandatoryBenefits: [
        "SSS (Social Security System) - 9.5% employer contribution",
        "PhilHealth - 3% employer contribution (shared with employee)",
        "Pag-IBIG Fund - 2% employer contribution",
        "13th Month Pay - Mandatory additional month's salary by December 24",
        "Service Incentive Leave - 5 days paid leave after 1 year service",
        "Overtime Pay - 25% premium for work beyond 8 hours",
        "Night Shift Differential - 10% of regular wage for 10 PM - 6 AM work",
        "Holiday Pay - Premium rates for regular and special holidays"
      ],
      
      payrollTax: {
        threshold: "No payroll tax - withholding tax on compensation",
        rates: "Progressive rates from 0% to 35% on employee income",
        notes: "Employer responsible for accurate withholding and remittance"
      },
      
      workersComp: {
        required: "Employees' Compensation Program under SSS/GSIS",
        rates: "Included in SSS contributions (no separate premium)",
        provider: "Government-administered program"
      },
      
      compliance: [
        "Department of Labor and Employment (DOLE) registration",
        "BIR registration for tax withholding obligations",
        "Monthly remittance of SSS, PhilHealth, and Pag-IBIG contributions",
        "Annual filing of Alphalist of employees with BIR",
        "Occupational safety and health program implementation"
      ],
      
      termination: {
        notice: "30 days written notice (or pay in lieu) for authorized causes",
        severance: "Separation pay for authorized causes (1/2 month to 1 month per year)",
        unfairDismissal: "Strong job security - just or authorized cause required"
      }
    }
  },
  {
    id: "japan",
    name: "Japan",
    flag: "🇯🇵",
    currency: "JPY",
    minWage: "¥901/hour (national average)",
    workingHours: "40 hours/week, 8 hours/day",
    funFact: "Japan pioneered many modern employment practices including lifetime employment, quality circles, and 'nemawashi' (consensus building). The concept of 'karoshi' (death from overwork) led to major labor reforms in recent years.",
    image: (
      <svg viewBox="0 0 400 300" className="w-full h-48 rounded-lg">
        <defs>
          <linearGradient id="jpskyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFB6C1" />
            <stop offset="100%" stopColor="#FFF0F5" />
          </linearGradient>
        </defs>
        <rect width="400" height="300" fill="url(#jpskyGrad)" />
        <path d="M150 200 Q200 180 250 200 Q300 180 350 200 L350 300 L150 300 Z" fill="#8B4513" />
        <path d="M160 180 Q200 160 240 180 Q280 160 320 180 L320 200 L160 200 Z" fill="#A0522D" />
        <path d="M170 160 Q200 140 230 160 Q260 140 290 160 L290 180 L170 180 Z" fill="#CD853F" />
        <circle cx="100" cy="120" r="30" fill="#FF69B4" />
        <circle cx="95" cy="115" r="25" fill="#FFB6C1" />
        <circle cx="90" cy="110" r="20" fill="#FFC0CB" />
        <circle cx="300" cy="100" r="25" fill="#FF69B4" />
        <circle cx="295" cy="95" r="20" fill="#FFB6C1" />
        <circle cx="350" cy="80" r="30" fill="#FF1493" />
        <circle cx="345" cy="75" r="25" fill="#FF69B4" />
        <rect x="200" y="60" width="15" height="140" fill="#654321" />
        <path d="M180 80 Q200 60 220 80 Q240 60 260 80 L260 100 L180 100 Z" fill="#228B22" />
        <circle cx="50" cy="50" r="25" fill="#FFD700" />
        <path d="M0 250 Q50 240 100 250 Q150 240 200 250 L200 300 L0 300 Z" fill="#4169E1" />
      </svg>
    ),
    guide: {
      overview: "Japanese employment law emphasizes lifetime employment traditions while adapting to modern flexibility needs. The system provides strong job security protections and comprehensive social insurance coverage with collective bargaining traditions.",
      
      keyLaws: [
        "Labor Standards Act - Working conditions and labor standards",
        "Labor Contract Act - Employment contract regulations",
        "Equal Employment Opportunity Act - Gender equality and discrimination",
        "Worker Dispatching Act - Temporary and contract worker regulations",
        "Industrial Safety and Health Act - Workplace safety requirements"
      ],
      
      employmentTypes: [
        {
          type: "Regular Employment (Seishain)",
          description: "Permanent full-time employment with comprehensive benefits and job security"
        },
        {
          type: "Contract Employment (Keiyaku-shain)",
          description: "Fixed-term contracts with specific terms and limited renewal options"
        },
        {
          type: "Part-time Employment (Paato)",
          description: "Shorter working hours with pro-rata benefits and protections"
        },
        {
          type: "Dispatched Workers (Haken)",
          description: "Temporary workers assigned through staffing agencies"
        }
      ],
      
      mandatoryBenefits: [
        "Social Insurance - Health insurance, welfare pension, employment insurance",
        "Workers' Accident Compensation Insurance - Workplace injury coverage",
        "Employment Insurance - Unemployment benefits (employer: 0.6%, employee: 0.3%)",
        "Annual Paid Leave - Minimum 10 days after 6 months, increasing with tenure",
        "Bonus Payments - Customary semi-annual bonuses (not legally required)",
        "Overtime Premium - 25% for weekdays, 35% for holidays, 25% for late night",
        "Retirement Allowance - Customary lump-sum payment upon retirement"
      ],
      
      payrollTax: {
        threshold: "No payroll tax - income tax withheld from employees",
        rates: "Social insurance contributions approximately 15% of salary",
        notes: "Health insurance, pension, employment insurance shared employer/employee"
      },
      
      workersComp: {
        required: "Workers' Accident Compensation Insurance mandatory",
        rates: "0.25% - 11.8% depending on industry type",
        provider: "Government-administered program"
      },
      
      compliance: [
        "Labor Standards Office registration and reporting",
        "36 Agreement filing for overtime work",
        "Social insurance enrollment for eligible employees",
        "Annual health checkups for all employees",
        "Safety and health management systems for larger workplaces"
      ],
      
      termination: {
        notice: "30 days notice or 30 days average wages in lieu",
        severance: "Retirement allowance customary but not legally required",
        unfairDismissal: "Objective reasonable grounds and social reasonableness required"
      }
    }
  },
  {
    id: "canada",
    name: "Canada",
    flag: "🇨🇦",
    currency: "CAD",
    minWage: "C$15.00-C$16.77/hour (varies by province)",
    workingHours: "40-48 hours/week (varies by province)",
    funFact: "Canada offers one of the world's most generous parental leave systems - up to 18 months of combined maternity and parental leave. The country is also known for its 'sorry' culture and exceptionally polite workplace environments.",
    image: (
      <svg viewBox="0 0 400 300" className="w-full h-48 rounded-lg">
        <defs>
          <linearGradient id="caskyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4682B4" />
            <stop offset="100%" stopColor="#B0E0E6" />
          </linearGradient>
        </defs>
        <rect width="400" height="300" fill="url(#caskyGrad)" />
        <path d="M0 200 Q100 180 200 200 Q300 180 400 200 L400 300 L0 300 Z" fill="#228B22" />
        <circle cx="80" cy="100" r="40" fill="#006400" />
        <circle cx="200" cy="80" r="45" fill="#228B22" />
        <circle cx="320" cy="110" r="35" fill="#32CD32" />
        <rect x="75" y="60" width="10" height="80" fill="#8B4513" />
        <rect x="195" y="35" width="10" height="85" fill="#654321" />
        <rect x="315" y="75" width="10" height="70" fill="#8B4513" />
        <path d="M190 20 L200 5 L210 20 L205 30 L195 30 Z" fill="#DC143C" />
        <path d="M185 25 L200 15 L215 25 L210 35 L190 35 Z" fill="#B22222" />
        <path d="M50 180 L100 130 L150 180 L50 180" fill="#FF6B35" />
        <path d="M250 190 L300 140 L350 190 L250 190" fill="#FF4500" />
        <circle cx="50" cy="50" r="20" fill="#FFD700" />
        <path d="M0 220 Q100 210 200 220 Q300 210 400 220 L400 240 L0 240 Z" fill="#FFFAF0" />
      </svg>
    ),
    guide: {
      overview: "Canadian employment law is primarily provincial jurisdiction with federal standards for specific industries. The system provides strong worker protections through human rights legislation, employment standards, and workers' compensation programs.",
      
      keyLaws: [
        "Canada Labour Code - Federal employees and federally regulated industries",
        "Provincial Employment Standards Acts - Most private sector employees",
        "Canadian Human Rights Act - Federal anti-discrimination protection",
        "Provincial Human Rights Codes - Provincial anti-discrimination laws",
        "Occupational Health and Safety Acts - Workplace safety (provincial)"
      ],
      
      employmentTypes: [
        {
          type: "Permanent Employment",
          description: "Ongoing employment with full benefits and reasonable notice protections"
        },
        {
          type: "Fixed-term Contract",
          description: "Employment for specific period with limited renewal provisions"
        },
        {
          type: "Casual/Temporary",
          description: "Irregular work with pro-rata entitlements in most provinces"
        }
      ],
      
      mandatoryBenefits: [
        "Canada Pension Plan (CPP) - 5.95% employer contribution (2023)",
        "Employment Insurance (EI) - 1.4 times employee contribution",
        "Workers' Compensation - Varies by province and industry (1-6%)",
        "Vacation Pay - Minimum 2 weeks (4% of wages) increasing with service",
        "Public Holidays - 5-9 statutory holidays depending on province",
        "Sick Leave - Varies by province (3-5 days becoming more common)",
        "Parental Leave - Up to 12-18 months (varies by province/benefit choice)"
      ],
      
      payrollTax: {
        threshold: "No payroll tax in most provinces (exceptions: Ontario, Quebec)",
        rates: "Ontario: 0.98% on payroll over $450,000. Quebec: varies by size",
        notes: "CPP/EI deductions required. Provincial health taxes may apply."
      },
      
      workersComp: {
        required: "Mandatory in all provinces for most employees",
        rates: "0.5% - 6%+ depending on industry classification and claims history",
        provider: "Provincial workers' compensation boards"
      },
      
      compliance: [
        "Canada Revenue Agency (CRA) payroll account registration",
        "Record of Employment (ROE) issuance for departing employees",
        "Provincial employment standards compliance", 
        "Workers' compensation board registration",
        "Workplace safety program implementation"
      ],
      
      termination: {
        notice: "Varies by province: 1-8 weeks statutory + reasonable notice at common law",
        severance: "Severance pay in some provinces for mass layoffs",
        unfairDismissal: "Wrongful dismissal protections - just cause or reasonable notice"
      }
    }
  },
  {
    id: "uk",
    name: "United Kingdom",
    flag: "🇬🇧",
    currency: "GBP",
    minWage: "£10.42/hour (National Living Wage 23+)",
    workingHours: "48 hours/week maximum (Working Time Regulations)",
    funFact: "The UK pioneered the modern concept of workers' rights during the Industrial Revolution. Today, it's a leader in flexible working arrangements with a legal 'right to request' flexible working from day one of employment.",
    image: (
      <svg viewBox="0 0 400 300" className="w-full h-48 rounded-lg">
        <defs>
          <linearGradient id="ukskyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#708090" />
            <stop offset="100%" stopColor="#D3D3D3" />
          </linearGradient>
        </defs>
        <rect width="400" height="300" fill="url(#ukskyGrad)" />
        <circle cx="80" cy="80" r="15" fill="#F0F8FF" opacity="0.8" />
        <circle cx="120" cy="60" r="20" fill="#F0F8FF" opacity="0.7" />
        <circle cx="160" cy="70" r="18" fill="#F0F8FF" opacity="0.8" />
        <circle cx="200" cy="50" r="22" fill="#F0F8FF" opacity="0.6" />
        <circle cx="240" cy="65" r="16" fill="#F0F8FF" opacity="0.8" />
        <circle cx="280" cy="55" r="19" fill="#F0F8FF" opacity="0.7" />
        <circle cx="320" cy="75" r="17" fill="#F0F8FF" opacity="0.8" />
        <path d="M0 200 Q100 180 200 200 Q300 180 400 200 L400 300 L0 300 Z" fill="#228B22" />
        <rect x="100" y="120" width="40" height="80" fill="#8B4513" />
        <rect x="110" y="110" width="20" height="10" fill="#654321" />
        <rect x="115" y="140" width="8" height="12" fill="#4169E1" />
        <rect x="125" y="140" width="8" height="12" fill="#4169E1" />
        <rect x="115" y="155" width="18" height="8" fill="#654321" />
        <rect x="200" y="130" width="60" height="70" fill="#A0522D" />
        <rect x="210" y="120" width="40" height="10" fill="#654321" />
        <rect x="215" y="150" width="10" height="15" fill="#4169E1" />
        <rect x="235" y="150" width="10" height="15" fill="#4169E1" />
        <circle cx="350" cy="100" r="25" fill="#FFD700" opacity="0.5" />
      </svg>
    ),
    guide: {
      overview: "UK employment law provides comprehensive worker protections through statute and common law. Post-Brexit changes have maintained EU-derived rights while developing distinct British approaches to employment relations.",
      
      keyLaws: [
        "Employment Rights Act 1996 - Core employment protections",
        "Equality Act 2010 - Anti-discrimination and equal pay",
        "Working Time Regulations 1998 - Hours, breaks, and holiday entitlements", 
        "Trade Union and Labour Relations Act 1992 - Collective bargaining rights",
        "Health and Safety at Work Act 1974 - Workplace safety duties"
      ],
      
      employmentTypes: [
        {
          type: "Employee",
          description: "Full employment rights and protections under employment contract"
        },
        {
          type: "Worker", 
          description: "Intermediate status with some rights (minimum wage, holidays) but not full protection"
        },
        {
          type: "Self-employed/Contractor",
          description: "No employment rights - commercial relationship only"
        }
      ],
      
      mandatoryBenefits: [
        "Employer National Insurance - 13.8% on earnings above £175/week",
        "Apprenticeship Levy - 0.5% of annual payroll above £3 million",
        "Auto-enrolment Pension - Minimum 3% employer contribution",
        "Statutory Sick Pay - £109.40/week for up to 28 weeks",
        "Annual Leave - 5.6 weeks (28 days) minimum including public holidays",
        "Maternity Pay - 90% of wages for 6 weeks, then £172.48/week for 33 weeks",
        "Paternity Leave - 2 weeks paid leave for partners"
      ],
      
      payrollTax: {
        threshold: "No payroll tax - income tax via PAYE system",
        rates: "20% basic rate, 40% higher rate, 45% additional rate",
        notes: "Employer NI at 13.8% above £175/week threshold"
      },
      
      workersComp: {
        required: "Employers' liability insurance mandatory (minimum £5 million)",
        rates: "Varies by industry and claims history",
        provider: "Private insurance companies"
      },
      
      compliance: [
        "HMRC PAYE registration and Real Time Information (RTI) submission",
        "Auto-enrolment pension scheme compliance",
        "Right to work document checking and retention",
        "Gender pay gap reporting (250+ employees)",
        "IR35 off-payroll working rules compliance"
      ],
      
      termination: {
        notice: "Minimum 1 week after 1 month, increasing to 12 weeks after 12 years",
        severance: "Statutory redundancy pay: 0.5-1.5 weeks per year of service",
        unfairDismissal: "Protection after 2 years service - fair reason and procedure required"
      }
    }
  },
  {
    id: "romania",
    name: "Romania",
    flag: "🇷🇴",
    currency: "RON",
    minWage: "3,000 RON/month (gross)",
    workingHours: "8 hours/day, 40 hours/week",
    funFact: "Romania transformed from one of Europe's highest-tax countries to one of the most competitive in 2018 by shifting most social contributions from employers to employees, reducing employer costs by over 20%.",
    image: (
      <svg viewBox="0 0 400 300" className="w-full h-48 rounded-lg">
        <defs>
          <linearGradient id="roskyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4682B4" />
            <stop offset="100%" stopColor="#87CEEB" />
          </linearGradient>
        </defs>
        <rect width="400" height="300" fill="url(#roskyGrad)" />
        <path d="M0 200 Q100 180 200 200 Q300 180 400 200 L400 300 L0 300 Z" fill="#228B22" />
        <path d="M100 120 Q150 80 200 120 Q250 80 300 120 L300 200 L100 200 Z" fill="#8B4513" />
        <path d="M110 130 Q150 90 190 130 Q230 90 270 130 L270 190 L110 190 Z" fill="#A0522D" />
        <rect x="180" y="60" width="40" height="120" fill="#654321" />
        <rect x="190" y="50" width="20" height="10" fill="#8B0000" />
        <rect x="195" y="80" width="10" height="15" fill="#4169E1" />
        <rect x="195" y="110" width="10" height="15" fill="#4169E1" />
        <rect x="185" y="95" width="8" height="8" fill="#FFD700" />
        <rect x="207" y="95" width="8" height="8" fill="#FFD700" />
        <circle cx="80" cy="60" r="20" fill="#FFD700" />
        <path d="M50 180 L100 130 L150 180 L50 180" fill="#FF6B35" />
        <path d="M250 190 L300 140 L350 190 L250 190" fill="#FF4500" />
      </svg>
    ),
    guide: {
      overview: "Romanian employment law follows EU directives while maintaining local specificities. Since 2018, most social contributions shifted to employees, reducing employer costs significantly compared to other EU countries.",
      
      keyLaws: [
        "Labor Code (Law 53/2003) - Primary employment legislation",
        "Law 346/2002 - Occupational health and safety",
        "Government Emergency Ordinance 96/2003 - Maternity and parental leave",
        "Law 76/2002 - Unemployment insurance system",
        "Government Decision 905/2017 - Implementation of labor regulations"
      ],
      
      employmentTypes: [
        {
          type: "Individual Employment Contract",
          description: "Standard permanent employment with indefinite duration"
        },
        {
          type: "Fixed-term Contract",
          description: "Maximum 24 months (36 months in specific cases)"
        },
        {
          type: "Part-time Employment",
          description: "Reduced working hours with pro-rata benefits"
        }
      ],
      
      mandatoryBenefits: [
        "Work Insurance Contribution - 2.25% employer contribution",
        "Annual Leave - Minimum 20 working days (25 days for university graduates)",
        "Public Holidays - 15 public holidays per year",
        "Sick Leave - First 5 days paid by employer, remainder by health insurance",
        "Maternity Leave - 126 days with 85% of gross salary",
        "Meal Vouchers - Tax-efficient benefit (RON 20-30/day common)",
        "Transportation Allowance - Common benefit for commuting costs"
      ],
      
      payrollTax: {
        threshold: "No payroll tax - income tax on employees",
        rates: "10% flat income tax rate. Employee social contributions ~35%",
        notes: "Significant reduction in employer costs since 2018 tax reforms"
      },
      
      workersComp: {
        required: "Work accident and occupational disease insurance",
        rates: "Between 0.15% and 0.85% depending on risk class",
        provider: "Private insurance companies authorized by ASF"
      },
      
      compliance: [
        "Individual employment contract registration in REVISAL",
        "Monthly salary declarations and social contribution payments",
        "Annual fiscal declarations and reporting",
        "Occupational health and safety documentation",
        "GDPR compliance for employee personal data"
      ],
      
      termination: {
        notice: "20 working days for employees, 45 days for management",
        severance: "1-6 months compensation depending on cause and length of service",
        unfairDismissal: "Protection against unjustified dismissal with compensation rights"
      }
    }
  },
  {
    id: "singapore",
    name: "Singapore",
    flag: "🇸🇬",
    currency: "SGD",
    minWage: "No statutory minimum wage",
    workingHours: "44 hours/week maximum",
    funFact: "Singapore has no minimum wage but maintains high salary standards through market forces and the Progressive Wage Model. The city-state is ranked #1 globally for ease of doing business and has one of the world's most efficient labor markets.",
    image: (
      <svg viewBox="0 0 400 300" className="w-full h-48 rounded-lg">
        <defs>
          <linearGradient id="sgskyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#00BFFF" />
            <stop offset="100%" stopColor="#87CEEB" />
          </linearGradient>
        </defs>
        <rect width="400" height="300" fill="url(#sgskyGrad)" />
        <rect x="80" y="80" width="50" height="220" fill="#C0C0C0" />
        <rect x="150" y="60" width="60" height="240" fill="#A9A9A9" />
        <rect x="230" y="40" width="70" height="260" fill="#808080" />
        <rect x="320" y="70" width="55" height="230" fill="#696969" />
        <rect x="85" y="70" width="10" height="10" fill="#FFD700" />
        <rect x="105" y="85" width="10" height="10" fill="#FFD700" />
        <rect x="125" y="100" width="10" height="10" fill="#FFD700" />
        <rect x="155" y="50" width="15" height="15" fill="#FFD700" />
        <rect x="185" y="65" width="15" height="15" fill="#FFD700" />
        <rect x="240" y="30" width="20" height="20" fill="#FFD700" />
        <rect x="270" y="45" width="20" height="20" fill="#FFD700" />
        <rect x="330" y="60" width="15" height="15" fill="#FFD700" />
        <circle cx="50" cy="50" r="20" fill="#FFD700" />
        <path d="M0 280 Q100 270 200 280 Q300 270 400 280 L400 300 L0 300 Z" fill="#4169E1" />
        <circle cx="100" cy="285" r="3" fill="#FFD700" />
        <circle cx="200" cy="285" r="3" fill="#FFD700" />
        <circle cx="300" cy="285" r="3" fill="#FFD700" />
      </svg>
    ),
    guide: {
      overview: "Singapore's employment framework emphasizes flexibility and competitiveness while providing essential worker protections. The system distinguishes between different worker categories with varying entitlements based on salary levels.",
      
      keyLaws: [
        "Employment Act - Covers employees earning up to S$4,500/month",
        "Industrial Relations Act - Trade union and collective bargaining rights",
        "Child Development Co-Savings Act - Maternity and childcare leave",
        "Workplace Safety and Health Act - Occupational safety requirements",
        "Retirement and Re-employment Act - Age discrimination and retirement"
      ],
      
      employmentTypes: [
        {
          type: "Local Employee",
          description: "Singapore citizens and permanent residents with full entitlements"
        },
        {
          type: "Foreign Employee (Work Permit)",
          description: "Lower-skilled foreign workers with basic protections"
        },
        {
          type: "Foreign Employee (S Pass/Employment Pass)",
          description: "Skilled foreign workers with standard employment protections"
        }
      ],
      
      mandatoryBenefits: [
        "CPF (Central Provident Fund) - 17% employer contribution for citizens/PRs under 55",
        "Skills Development Levy - 0.25% on monthly wages up to S$5,000",
        "Annual Leave - Varies (7-14 days minimum under Employment Act)",
        "Sick Leave - 14-60 days depending on service length",
        "Maternity Leave - 16 weeks paid leave (12 weeks government, 4 weeks employer)",
        "Paternity Leave - 2 weeks paid leave for fathers",
        "Public Holidays - 11 gazetted public holidays"
      ],
      
      payrollTax: {
        threshold: "No payroll tax - individual income tax system",
        rates: "Progressive rates from 0% to 22% (residents) or flat 15-22% (non-residents)",
        notes: "No CPF for most foreign workers on Employment Pass"
      },
      
      workersComp: {
        required: "Work injury compensation insurance for all employees",
        rates: "Varies by industry risk classification and insurer",
        provider: "Private insurance companies"
      },
      
      compliance: [
        "Ministry of Manpower (MOM) work pass and quota compliance",
        "CPF contributions for eligible employees",
        "Skills Development Levy payment",
        "Itemized payslips and Key Employment Terms (KET) documentation",
        "Workplace Safety and Health risk management"
      ],
      
      termination: {
        notice: "Varies by contract and service length (typically 1-3 months)",
        severance: "Not statutorily required (unless contractually specified)",
        unfairDismissal: "Limited protections - primarily procedural requirements"
      }
    }
  },
  {
    id: "malaysia",
    name: "Malaysia",
    flag: "🇲🇾",
    currency: "MYR",
    minWage: "RM 1,500/month",
    workingHours: "8 hours/day, 48 hours/week",
    funFact: "Malaysia is a leading destination for Islamic finance and Halal business, with Kuala Lumpur serving as a global hub. The country uniquely combines modern employment laws with traditional values, creating a harmonious multicultural workplace environment.",
    image: (
      <svg viewBox="0 0 400 300" className="w-full h-48 rounded-lg">
        <defs>
          <linearGradient id="myskyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#00BFFF" />
            <stop offset="100%" stopColor="#87CEEB" />
          </linearGradient>
        </defs>
        <rect width="400" height="300" fill="url(#myskyGrad)" />
        <path d="M0 200 Q200 180 400 200 L400 300 L0 300 Z" fill="#228B22" />
        <circle cx="100" cy="120" r="40" fill="#006400" />
        <circle cx="200" cy="100" r="35" fill="#228B22" />
        <circle cx="300" cy="130" r="30" fill="#32CD32" />
        <rect x="95" y="80" width="10" height="80" fill="#654321" />
        <rect x="195" y="65" width="10" height="70" fill="#8B4513" />
        <rect x="295" y="100" width="10" height="60" fill="#654321" />
        <path d="M50 180 L100 130 L150 180 L50 180" fill="#FF6B35" />
        <path d="M180 190 L230 140 L280 190 L180 190" fill="#FF4500" />
        <path d="M320 200 L370 150 L400 200 L320 200" fill="#FF6B35" />
        <rect x="150" y="160" width="50" height="80" fill="#8B4513" />
        <rect x="160" y="150" width="30" height="10" fill="#654321" />
        <rect x="165" y="180" width="8" height="12" fill="#4169E1" />
        <rect x="182" y="180" width="8" height="12" fill="#4169E1" />
        <circle cx="350" cy="50" r="20" fill="#FFD700" />
        <path d="M0 220 Q100 210 200 220 Q300 210 400 220 L400 240 L0 240 Z" fill="#FFE4B5" />
      </svg>
    ),
    guide: {
      overview: "Malaysian employment law provides comprehensive worker protections through the Employment Act 1955, with additional industry-specific regulations. The system includes strong social security provisions and emerging digital economy adaptations.",
      
      keyLaws: [
        "Employment Act 1955 - Primary employment legislation for private sector",
        "Industrial Relations Act 1967 - Trade unions and industrial disputes",
        "Employees Provident Fund Act 1991 - Retirement savings scheme",
        "Employment Insurance System Act 2017 - Unemployment benefits",
        "Occupational Safety and Health Act 1994 - Workplace safety"
      ],
      
      employmentTypes: [
        {
          type: "Permanent Employment",
          description: "Ongoing employment with full statutory benefits and protections"
        },
        {
          type: "Contract Employment",
          description: "Fixed-term contracts with specific duration and renewal terms"
        },
        {
          type: "Part-time Employment",
          description: "Reduced hours work with pro-rata entitlements"
        }
      ],
      
      mandatoryBenefits: [
        "EPF (Employees Provident Fund) - 12% employer contribution",
        "SOCSO (Social Security Organisation) - 1.75% employer contribution",
        "EIS (Employment Insurance System) - 0.2% employer contribution", 
        "Human Resource Development Fund - 1% for applicable employers",
        "Annual Leave - 8-16 days depending on service length",
        "Sick Leave - 14-22 days depending on service length and hospitalization",
        "Maternity Leave - 98 days (60 days paid by employer, 38 days by SOCSO)",
        "Public Holidays - 5 national holidays plus state-specific holidays"
      ],
      
      payrollTax: {
        threshold: "No payroll tax - Progressive Comprehensive Tax (PCB) on employees",
        rates: "0% to 30% progressive tax rates on employee income",
        notes: "Employer withholds and remits employee income tax monthly"
      },
      
      workersComp: {
        required: "SOCSO provides employment injury coverage",
        rates: "Included in SOCSO contribution (no separate premium)",
        provider: "Government-administered SOCSO scheme"
      },
      
      compliance: [
        "EPF, SOCSO, and EIS registration and monthly contributions",
        "Human Resource Development Fund registration (if applicable)",
        "Monthly tax deduction (PCB) and annual reporting",
        "Employment Act notice requirements and record keeping",
        "Foreign worker permit and levy compliance"
      ],
      
      termination: {
        notice: "4 weeks for monthly employees, varies for others",
        severance: "Lay-off benefits: 10-20 days pay per year of service",
        unfairDismissal: "Protection through Industrial Relations Act - just cause required"
      }
    }
  },
  {
    id: "vietnam",
    name: "Vietnam",
    flag: "🇻🇳",
    currency: "VND",
    minWage: "4.42-6.20 million VND/month (varies by region)",
    workingHours: "8 hours/day, 48 hours/week",
    funFact: "Vietnam has emerged as a major manufacturing hub, especially for electronics and textiles. The country mandates that all companies establish trade unions, making it unique in requiring worker representation as part of employment compliance.",
    image: (
      <svg viewBox="0 0 400 300" className="w-full h-48 rounded-lg">
        <defs>
          <linearGradient id="vnskyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#87CEEB" />
            <stop offset="100%" stopColor="#E0F6FF" />
          </linearGradient>
        </defs>
        <rect width="400" height="300" fill="url(#vnskyGrad)" />
        <path d="M0 180 Q100 160 200 180 Q300 160 400 180 L400 300 L0 300 Z" fill="#228B22" />
        <path d="M50 160 Q100 140 150 160 Q200 140 250 160 Q300 140 350 160 L350 180 L50 180 Z" fill="#32CD32" />
        <circle cx="80" cy="100" r="30" fill="#006400" />
        <circle cx="180" cy="80" r="25" fill="#228B22" />
        <circle cx="280" cy="110" r="20" fill="#32CD32" />
        <circle cx="350" cy="90" r="15" fill="#228B22" />
        <rect x="75" y="70" width="10" height="60" fill="#654321" />
        <rect x="175" y="55" width="10" height="50" fill="#8B4513" />
        <rect x="275" y="90" width="10" height="40" fill="#654321" />
        <rect x="345" y="75" width="10" height="30" fill="#8B4513" />
        <path d="M100 200 L140 170 L180 200 L100 200" fill="#FF6B35" />
        <path d="M220 210 L260 180 L300 210 L220 210" fill="#FF4500" />
        <circle cx="50" cy="50" r="20" fill="#FFD700" />
        <path d="M0 240 Q200 230 400 240 L400 260 L0 260 Z" fill="#4169E1" />
        <rect x="120" y="190" width="30" height="50" fill="#8B4513" />
        <rect x="130" y="180" width="10" height="10" fill="#654321" />
        <path d="M110 220 L125 205 L140 220 L110 220" fill="#DC143C" />
      </svg>
    ),
    guide: {
      overview: "Vietnam's Labor Code provides comprehensive worker protections with emphasis on social insurance and collective bargaining. The system includes mandatory trade union participation and strong job security provisions for permanent employees.",
      
      keyLaws: [
        "Labor Code (Law 45/2019) - Comprehensive employment legislation",
        "Law on Social Insurance (Law 58/2014) - Social security benefits",
        "Law on Trade Union (Law 12/2012) - Worker representation and collective bargaining",
        "Law on Occupational Safety and Health (Law 84/2015) - Workplace safety",
        "Law on Employment (Law 38/2013) - Employment promotion and job placement"
      ],
      
      employmentTypes: [
        {
          type: "Indefinite-term Contract",
          description: "Permanent employment with comprehensive protections and benefits"
        },
        {
          type: "Definite-term Contract", 
          description: "Fixed-term contracts (12-36 months) with renewal limitations"
        },
        {
          type: "Seasonal/Specific Work Contract",
          description: "Employment for seasonal work or specific tasks under 12 months"
        }
      ],
      
      mandatoryBenefits: [
        "Social Insurance - 17.5% employer contribution (sickness, maternity, retirement)",
        "Health Insurance - 3% employer contribution",
        "Unemployment Insurance - 1% employer contribution",
        "Trade Union Fund - 2% of total wage fund for trade union activities",
        "Annual Leave - 12 days minimum, increasing with dangerous/harsh conditions",
        "Public Holidays - 10 public holidays plus traditional holidays",
        "Overtime Pay - 150%-300% depending on time (weekday/weekend/holiday)",
        "13th Month Bonus - Common practice (often contractually required)"
      ],
      
      payrollTax: {
        threshold: "11 million VND/month (personal income tax exemption)",
        rates: "Progressive rates from 5% to 35% on employee income",
        notes: "Employer withholds and remits personal income tax monthly"
      },
      
      workersComp: {
        required: "Occupational accident and disease insurance included in social insurance",
        rates: "Included in 17.5% social insurance contribution",
        provider: "Vietnam Social Security agency"
      },
      
      compliance: [
        "Social insurance, health insurance, and unemployment insurance registration",
        "Trade union establishment or fee payment",
        "Labor contract registration with local authorities",
        "Monthly and annual social insurance and tax reporting",
        "Workplace safety and health regulation compliance"
      ],
      
      termination: {
        notice: "30-45 days depending on contract type and reason",
        severance: "0.5-1 month salary per year of service (depending on reason)",
        unfairDismissal: "Strong job security - specific grounds and procedures required"
      }
    }
  },
  {
    id: "india",
    name: "India",
    flag: "🇮🇳",
    currency: "INR",
    minWage: "₹176-₹600/day (varies by state and skill level)",
    workingHours: "8 hours/day, 48 hours/week",
    funFact: "India is the world's largest democracy and IT services exporter, with over 4.5 million people employed in the technology sector. The country recently consolidated 44 labor laws into 4 comprehensive codes to simplify compliance.",
    image: (
      <svg viewBox="0 0 400 300" className="w-full h-48 rounded-lg">
        <defs>
          <linearGradient id="inskyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FF8C00" />
            <stop offset="100%" stopColor="#FFE4B5" />
          </linearGradient>
        </defs>
        <rect width="400" height="300" fill="url(#inskyGrad)" />
        <path d="M0 200 Q100 180 200 200 Q300 180 400 200 L400 300 L0 300 Z" fill="#228B22" />
        <path d="M150 120 Q200 80 250 120 Q300 80 350 120 L350 200 L150 200 Z" fill="#8B4513" />
        <rect x="190" y="60" width="60" height="140" fill="#654321" />
        <path d="M180 80 Q200 60 220 80 Q240 60 260 80 L260 120 L180 120 Z" fill="#FF6B35" />
        <path d="M185 90 Q200 70 215 90 Q230 70 245 90 L245 110 L185 110 Z" fill="#FF4500" />
        <rect x="200" y="50" width="20" height="10" fill="#8B0000" />
        <rect x="205" y="140" width="10" height="15" fill="#4169E1" />
        <rect x="220" y="140" width="10" height="15" fill="#4169E1" />
        <circle cx="100" cy="80" r="30" fill="#006400" />
        <circle cx="320" cy="100" r="25" fill="#228B22" />
        <rect x="95" y="50" width="10" height="60" fill="#654321" />
        <rect x="315" y="75" width="10" height="50" fill="#8B4513" />
        <circle cx="50" cy="50" r="25" fill="#FFD700" />
        <path d="M50 180 L100 130 L150 180 L50 180" fill="#FF6B35" />
        <path d="M280 190 L330 140 L380 190 L280 190" fill="#FF4500" />
        <circle cx="200" cy="100" r="8" fill="#4169E1" />
        <path d="M200 92 L208 108 L192 108 Z" fill="#FFFFFF" />
      </svg>
    ),
    guide: {
      overview: "Indian labor law is complex with both central and state legislation governing different aspects of employment. Recent labor code reforms aim to simplify compliance while maintaining worker protections. The system emphasizes social security and formal employment benefits.",
      
      keyLaws: [
        "Code on Wages, 2019 - Minimum wages and payment of wages",
        "Industrial Relations Code, 2020 - Trade unions and industrial disputes",
        "Code on Social Security, 2020 - ESI, EPF, and other social security benefits",
        "Occupational Safety, Health and Working Conditions Code, 2020 - Workplace safety",
        "State-specific Shops and Establishments Acts - State-level employment regulations"
      ],
      
      employmentTypes: [
        {
          type: "Permanent Employment",
          description: "Regular employment with full statutory benefits and job security"
        },
        {
          type: "Contract Employment",
          description: "Fixed-term employment through principal employer or contractor"
        },
        {
          type: "Apprenticeship",
          description: "Training-based employment with specific skills development focus"
        }
      ],
      
      mandatoryBenefits: [
        "Provident Fund (EPF) - 12% employer contribution (on basic salary)",
        "Employee State Insurance (ESI) - 3.25% employer contribution (applicable thresholds)",
        "Gratuity - Accrual of 15 days wages per year after 5 years service",
        "Bonus - Minimum 8.33% of wages (Payment of Bonus Act applicable establishments)",
        "Annual Leave - 1 day for every 20 days worked in previous year",
        "Maternity Leave - 26 weeks paid leave (establishments with 10+ employees)",
        "Paternity Leave - Varies by state (7-15 days becoming common)"
      ],
      
      payrollTax: {
        threshold: "No payroll tax - TDS (Tax Deducted at Source) on employee salaries",
        rates: "Progressive income tax rates from 5% to 30% plus cess",
        notes: "Professional tax varies by state (₹200-₹2,500/year typically)"
      },
      
      workersComp: {
        required: "Workmen's Compensation Act coverage for occupational injuries",
        rates: "Varies by industry and state regulations",
        provider: "ESI scheme covers medical benefits; separate insurance for compensation"
      },
      
      compliance: [
        "EPF and ESI registration and monthly compliance",
        "TDS registration and monthly/quarterly filings", 
        "State labor law registrations and renewals",
        "Annual return filings for various labor laws",
        "Professional tax registration and payment (applicable states)"
      ],
      
      termination: {
        notice: "30 days notice or payment in lieu (varies by state/establishment size)",
        severance: "Retrenchment compensation: 15 days average pay per year of service",
        unfairDismissal: "Prior approval required for establishments with 100+ employees"
      }
    }
  },
  {
    id: "brazil",
    name: "Brazil",
    flag: "🇧🇷",
    currency: "BRL",
    minWage: "R$ 1,320/month",
    workingHours: "44 hours/week maximum",
    funFact: "Brazil has one of the world's most comprehensive labor protection systems, including a mandatory 13th salary, 30-day paid vacation with 1/3 bonus, and an 8% monthly deposit into a workers' severance fund (FGTS) that employees access when terminated.",
    image: (
      <svg viewBox="0 0 400 300" className="w-full h-48 rounded-lg">
        <defs>
          <linearGradient id="brskyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#00BFFF" />
            <stop offset="100%" stopColor="#87CEEB" />
          </linearGradient>
        </defs>
        <rect width="400" height="300" fill="url(#brskyGrad)" />
        <path d="M0 180 Q200 160 400 180 L400 300 L0 300 Z" fill="#228B22" />
        <circle cx="80" cy="100" r="50" fill="#006400" />
        <circle cx="200" cy="80" r="40" fill="#228B22" />
        <circle cx="320" cy="120" r="35" fill="#32CD32" />
        <rect x="75" y="50" width="10" height="100" fill="#8B4513" />
        <rect x="195" y="40" width="10" height="80" fill="#654321" />
        <rect x="315" y="85" width="10" height="70" fill="#8B4513" />
        <path d="M150 200 L200 150 L250 200 L150 200" fill="#FF6B35" />
        <path d="M50 220 L100 170 L150 220 L50 220" fill="#FF4500" />
        <path d="M270 210 L320 160 L370 210 L270 210" fill="#FF6B35" />
        <circle cx="350" cy="50" r="25" fill="#FFD700" />
        <path d="M0 240 Q100 230 200 240 Q300 230 400 240 L400 260 L0 260 Z" fill="#4169E1" />
        <circle cx="100" cy="245" r="3" fill="#FFD700" />
        <circle cx="200" cy="245" r="3" fill="#FFD700" />
        <circle cx="300" cy="245" r="3" fill="#FFD700" />
        <rect x="180" y="160" width="40" height="60" fill="#8B4513" />
        <rect x="190" y="150" width="20" height="10" fill="#654321" />
        <rect x="195" y="180" width="8" height="12" fill="#4169E1" />
        <path d="M170 200 L200 170 L230 200 L170 200" fill="#DC143C" />
      </svg>
    ),
    guide: {
      overview: "Brazilian labor law (CLT) provides extensive worker protections with high social security contributions and mandatory benefits. The system emphasizes formal employment relationships with significant employer obligations and costs.",
      
      keyLaws: [
        "Consolidação das Leis do Trabalho (CLT) - Primary labor legislation",
        "Federal Constitution of 1988 - Constitutional labor rights",
        "Law 8,036/1990 - FGTS (Severance Pay Fund)",
        "Law 8,213/1991 - Social Security benefits",
        "Regulatory Standards (NRs) - Occupational health and safety"
      ],
      
      employmentTypes: [
        {
          type: "CLT Employment",
          description: "Standard employment under CLT with comprehensive benefits and protections"
        },
        {
          type: "Fixed-term Contract",
          description: "Temporary contracts (maximum 2 years) with specific justifications required"
        },
        {
          type: "Apprenticeship",
          description: "Training contracts for youth (14-24 years) with reduced social charges"
        }
      ],
      
      mandatoryBenefits: [
        "INSS (Social Security) - 20% employer contribution on salaries",
        "FGTS (Severance Fund) - 8% monthly deposit in employee account",
        "13th Salary - Additional month's salary paid in two installments",
        "Vacation Bonus - 1/3 additional payment on annual vacation",
        "Annual Vacation - 30 days paid vacation after 12 months",
        "Transportation Voucher - Employer provides/subsidizes commuting costs",
        "Meal Voucher - Common benefit for meals (tax advantages)",
        "RAT (Work Accident Tax) - 1-3% based on company risk level"
      ],
      
      payrollTax: {
        threshold: "No threshold - contributions on all wages",
        rates: "INSS 20% + FGTS 8% + other contributions (~8-10%) = ~36-38% total",
        notes: "Additional contributions: third parties, system S, accident insurance"
      },
      
      workersComp: {
        required: "Work accident insurance through INSS system",
        rates: "RAT contribution: 1%, 2%, or 3% depending on company risk classification",
        provider: "Government-administered INSS system"
      },
      
      compliance: [
        "eSocial digital tax and labor reporting system",
        "Monthly FGTS and INSS payment and reporting",
        "Annual RAIS (employment information) declaration",
        "Occupational health and safety programs (PPRA, PCMSO)",
        "Labor inspection compliance and documentation"
      ],
      
      termination: {
        notice: "30 days advance notice (or payment in lieu)",
        severance: "FGTS balance + 40% penalty, unemployment insurance (if eligible)",
        unfairDismissal: "Stability during pregnancy, work accidents, union representation"
      }
    }
  },
  {
    id: "pakistan",
    name: "Pakistan",
    flag: "🇵🇰",
    currency: "PKR",
    minWage: "Rs 25,000/month (varies by province)",
    workingHours: "48 hours/week, 8 hours/day",
    funFact: "Pakistan has one of the world's fastest-growing IT sectors, with major outsourcing hubs in Karachi, Lahore, and Islamabad. The country is becoming a key destination for software development and business process outsourcing.",
    image: (
      <svg viewBox="0 0 400 300" className="w-full h-48 rounded-lg">
        <defs>
          <linearGradient id="pkskyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#87CEEB" />
            <stop offset="100%" stopColor="#E0F6FF" />
          </linearGradient>
        </defs>
        <rect width="400" height="300" fill="url(#pkskyGrad)" />
        <path d="M0 200 Q100 180 200 200 Q300 180 400 200 L400 300 L0 300 Z" fill="#228B22" />
        <rect x="150" y="80" width="100" height="120" fill="#8B4513" />
        <rect x="160" y="70" width="80" height="10" fill="#654321" />
        <rect x="175" y="100" width="15" height="20" fill="#4169E1" />
        <rect x="210" y="100" width="15" height="20" fill="#4169E1" />
        <path d="M180 50 L200 30 L220 50 L200 60 Z" fill="#DC143C" />
        <circle cx="350" cy="50" r="20" fill="#FFD700" />
        <path d="M50 180 L100 130 L150 180 L50 180" fill="#FF6B35" />
      </svg>
    ),
    guide: {
      overview: "Pakistani employment law is governed by various provincial labor laws and federal legislation, providing worker protections while supporting economic growth. The system includes social security benefits and focuses on industrial relations.",
      keyLaws: [
        "Industrial Relations Act 2012 - Trade unions and collective bargaining",
        "Provincial Shops and Establishments Ordinances - Working conditions",
        "Employees' Old-Age Benefits Act 1976 - Pension and retirement benefits",
        "Workers' Welfare Fund Ordinance 1971 - Worker welfare programs",
        "Employment of Children Act 1991 - Child labor protections"
      ],
      employmentTypes: [
        { type: "Permanent Employment", description: "Ongoing employment with full benefits and job security" },
        { type: "Contract Employment", description: "Fixed-term contracts for specific periods or projects" },
        { type: "Casual Labor", description: "Daily wage workers with basic protections" }
      ],
      mandatoryBenefits: [
        "EOBI (Employee Old-Age Benefits) - 5% employer, 1% employee contribution",
        "SESSI (Social Security) - 6% employer contribution for eligible employees",
        "Workers' Welfare Fund - 2% of profit for companies with specific thresholds",
        "Annual Leave - 21 days after 12 months of service",
        "Festival Bonus - Typically one month's salary for Eid celebrations"
      ],
      payrollTax: { threshold: "Varies by province", rates: "0-35% progressive tax on salary", notes: "Provincial variations in rates and thresholds" },
      workersComp: { required: "Through SESSI for covered employees", rates: "Included in 6% SESSI contribution", provider: "Social Security Institution" },
      compliance: ["Monthly SESSI and EOBI contributions", "Annual Workers' Welfare Fund payments", "Labor law compliance certificates", "Industrial relations notifications"],
      termination: { notice: "30 days for monthly paid, varies for others", severance: "Gratuity after 10 years service", unfairDismissal: "Protection through labor courts and tribunals" }
    }
  },
  {
    id: "sri-lanka",
    name: "Sri Lanka",
    flag: "🇱🇰",
    currency: "LKR",
    minWage: "Rs 12,500/month (minimum)",
    workingHours: "45 hours/week, 9 hours/day",
    funFact: "Sri Lanka has a 94% literacy rate and is known for its skilled workforce in technology, textiles, and tea production. The island nation is becoming a hub for IT services and business process outsourcing in South Asia.",
    image: (
      <svg viewBox="0 0 400 300" className="w-full h-48 rounded-lg">
        <defs>
          <linearGradient id="lkskyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#00BFFF" />
            <stop offset="100%" stopColor="#87CEEB" />
          </linearGradient>
        </defs>
        <rect width="400" height="300" fill="url(#lkskyGrad)" />
        <path d="M0 200 Q200 180 400 200 L400 300 L0 300 Z" fill="#4169E1" />
        <circle cx="80" cy="120" r="30" fill="#228B22" />
        <circle cx="200" cy="100" r="25" fill="#32CD32" />
        <circle cx="320" cy="130" r="20" fill="#006400" />
        <rect x="75" y="90" width="10" height="60" fill="#8B4513" />
        <rect x="195" y="75" width="10" height="50" fill="#654321" />
        <rect x="315" y="110" width="10" height="40" fill="#8B4513" />
        <circle cx="350" cy="50" r="18" fill="#FFD700" />
        <path d="M150 250 L180 220 L210 250 L150 250" fill="#FF6B35" />
      </svg>
    ),
    guide: {
      overview: "Sri Lankan employment law balances worker protection with economic flexibility, governed by various acts including the Shop and Office Employees Act and Industrial Disputes Act. The system emphasizes social protection through EPF and ETF schemes.",
      keyLaws: [
        "Shop and Office Employees Act No. 19 of 1954 - Private sector employment",
        "Industrial Disputes Act No. 43 of 1950 - Dispute resolution",
        "Employees' Provident Fund Act No. 15 of 1958 - Retirement savings",
        "Employees' Trust Fund Act No. 46 of 1980 - Training and development fund",
        "National Minimum Wage Act No. 3 of 2016 - Minimum wage regulations"
      ],
      employmentTypes: [
        { type: "Permanent Employment", description: "Ongoing employment with full statutory benefits" },
        { type: "Probationary Employment", description: "Initial period up to 6 months with reduced protections" },
        { type: "Contract Employment", description: "Fixed-term employment for specific periods" }
      ],
      mandatoryBenefits: [
        "EPF (Employees' Provident Fund) - 12% employer, 8% employee contribution",
        "ETF (Employees' Trust Fund) - 3% employer contribution",
        "Annual Leave - 14 days in first year, increasing with service",
        "Sick Leave - 21 days per year after probation",
        "Public Holidays - Approximately 25 public and mercantile holidays"
      ],
      payrollTax: { threshold: "Rs 100,000/month", rates: "0-30% progressive tax", notes: "Tax relief for EPF/ETF contributions" },
      workersComp: { required: "Through Workmen's Compensation Ordinance", rates: "Varies by industry risk", provider: "Insurance companies or self-insurance" },
      compliance: ["Monthly EPF and ETF remittances", "Annual gratuity calculations", "Labor department registrations", "Industrial tribunal compliance"],
      termination: { notice: "1 month for monthly paid employees", severance: "Gratuity after 5 years service", unfairDismissal: "Protection through Industrial Court system" }
    }
  },
  {
    id: "germany",
    name: "Germany",
    flag: "🇩🇪",
    currency: "EUR",
    minWage: "€12.00/hour (statutory minimum)",
    workingHours: "40 hours/week (48 hours maximum by law)",
    funFact: "Germany pioneered social insurance in the 1880s under Otto von Bismarck and has one of the most comprehensive employment protection systems in the world. The concept of 'Mitbestimmung' (co-determination) gives workers significant voice in company decisions.",
    image: (
      <svg viewBox="0 0 400 300" className="w-full h-48 rounded-lg">
        <defs>
          <linearGradient id="deskyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4682B4" />
            <stop offset="100%" stopColor="#B0E0E6" />
          </linearGradient>
        </defs>
        <rect width="400" height="300" fill="url(#deskyGrad)" />
        <path d="M0 200 Q100 180 200 200 Q300 180 400 200 L400 300 L0 300 Z" fill="#228B22" />
        <rect x="100" y="100" width="80" height="100" fill="#8B4513" />
        <rect x="110" y="90" width="60" height="10" fill="#654321" />
        <rect x="220" y="80" width="60" height="120" fill="#A0522D" />
        <rect x="230" y="70" width="40" height="10" fill="#654321" />
        <rect x="300" y="120" width="50" height="80" fill="#8B4513" />
        <circle cx="50" cy="60" r="20" fill="#FFD700" />
        <path d="M80 180 L120 140 L160 180 L80 180" fill="#FF6B35" />
      </svg>
    ),
    guide: {
      overview: "German employment law provides extensive worker protections through comprehensive labor legislation and strong collective bargaining traditions. The system emphasizes job security, social partnership, and comprehensive social insurance coverage.",
      keyLaws: [
        "Protection Against Dismissal Act (KSchG) - Termination protections",
        "Working Time Act (ArbZG) - Hours, breaks, and rest periods",
        "Federal Vacation Act (BUrlG) - Annual leave entitlements",
        "Maternity Protection Act (MuSchG) - Pregnancy and childbirth protections",
        "Works Constitution Act (BetrVG) - Employee representation rights"
      ],
      employmentTypes: [
        { type: "Permanent Employment (Unbefristet)", description: "Standard indefinite employment with full protections" },
        { type: "Fixed-term Employment (Befristet)", description: "Limited duration contracts up to 2 years (extensions possible)" },
        { type: "Part-time Employment (Teilzeit)", description: "Reduced hours with pro-rata benefits and protections" },
        { type: "Mini-jobs (Geringfügige Beschäftigung)", description: "Employment up to €520/month with reduced social contributions" }
      ],
      mandatoryBenefits: [
        "Health Insurance - ~7.3% employer, ~7.3% employee (plus supplements)",
        "Pension Insurance - 9.3% employer, 9.3% employee contribution",
        "Unemployment Insurance - 1.3% employer, 1.3% employee contribution",
        "Accident Insurance - ~1.3% employer contribution (varies by industry)",
        "Annual Leave - Minimum 24 working days (30 calendar days)",
        "Sick Pay - 6 weeks full pay, then health insurance coverage"
      ],
      payrollTax: { threshold: "€10,908/year basic allowance", rates: "14-45% progressive income tax", notes: "Church tax and solidarity surcharge may apply" },
      workersComp: { required: "Mandatory through Berufsgenossenschaften", rates: "0.8-4% of payroll depending on industry", provider: "Industry-specific accident insurance associations" },
      compliance: ["Monthly social insurance contributions", "Annual tax certificates", "Works council consultation requirements", "Data protection compliance"],
      termination: { notice: "4 weeks to 7 months depending on tenure", severance: "Not mandatory but common in practice", unfairDismissal: "Strong protection after 6 months, works council involvement" }
    }
  }
];

export default function CountryGuides() {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  if (selectedCountry) {
    const country = COUNTRIES.find(c => c.id === selectedCountry);
    if (!country) return null;
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          {/* Back Navigation */}
          <div className="mb-8">
            <Button 
              variant="ghost" 
              onClick={() => setSelectedCountry(null)}
              className="text-primary-600 hover:text-primary-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Country Guides
            </Button>
          </div>

          {/* Country Header */}
          <div className="text-center mb-12">
            <div className="mb-6">
              {country.image}
            </div>
            <div className="text-6xl mb-4">{country.flag}</div>
            <h1 className="text-4xl md:text-5xl font-bold text-secondary-900 mb-4">{country.name}</h1>
            <p className="text-xl text-secondary-600 max-w-3xl mx-auto mb-8">
              Comprehensive employment guide covering laws, benefits, compliance, and best practices
            </p>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <Card className="border-primary-200">
                <CardContent className="p-4 text-center">
                  <DollarSign className="w-8 h-8 text-primary-600 mx-auto mb-2" />
                  <div className="font-semibold text-secondary-900">Minimum Wage</div>
                  <div className="text-sm text-secondary-600">{country.minWage}</div>
                </CardContent>
              </Card>
              <Card className="border-accent-200">
                <CardContent className="p-4 text-center">
                  <Clock className="w-8 h-8 text-accent-600 mx-auto mb-2" />
                  <div className="font-semibold text-secondary-900">Working Hours</div>
                  <div className="text-sm text-secondary-600">{country.workingHours}</div>
                </CardContent>
              </Card>
              <Card className="border-secondary-200">
                <CardContent className="p-4 text-center">
                  <Globe className="w-8 h-8 text-secondary-600 mx-auto mb-2" />
                  <div className="font-semibold text-secondary-900">Currency</div>
                  <div className="text-sm text-secondary-600">{country.currency}</div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Content Sections */}
          <div className="space-y-8">
            {/* Fun Fact */}
            <Card className="border-accent-200 bg-gradient-to-r from-accent-50 to-accent-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="text-2xl">💡</div>
                  Fun Fact
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-secondary-700 leading-relaxed font-medium">{country.funFact}</p>
              </CardContent>
            </Card>

            {/* Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary-600" />
                  Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-secondary-700 leading-relaxed">{country.guide.overview}</p>
              </CardContent>
            </Card>

            {/* Key Laws */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary-600" />
                  Key Employment Laws
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {country.guide.keyLaws.map((law: string, index: number) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-primary-600 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-secondary-700">{law}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Employment Types */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary-600" />
                  Employment Types
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {country.guide.employmentTypes.map((type: any, index: number) => (
                    <div key={index} className="border border-secondary-200 rounded-lg p-4">
                      <h4 className="font-semibold text-secondary-900 mb-2">{type.type}</h4>
                      <p className="text-sm text-secondary-600">{type.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Mandatory Benefits */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary-600" />
                  Mandatory Benefits & Contributions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {country.guide.mandatoryBenefits.map((benefit: string, index: number) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-primary-50 rounded-lg">
                      <div className="w-2 h-2 bg-primary-600 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-secondary-700 text-sm">{benefit}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Tax Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary-600" />
                    Payroll Tax
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <span className="font-semibold text-secondary-900">Threshold:</span>
                    <p className="text-secondary-700">{country.guide.payrollTax.threshold}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-secondary-900">Rates:</span>
                    <p className="text-secondary-700">{country.guide.payrollTax.rates}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-secondary-900">Notes:</span>
                    <p className="text-secondary-700">{country.guide.payrollTax.notes}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary-600" />
                    Workers' Compensation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <span className="font-semibold text-secondary-900">Required:</span>
                    <p className="text-secondary-700">{country.guide.workersComp.required}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-secondary-900">Rates:</span>
                    <p className="text-secondary-700">{country.guide.workersComp.rates}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-secondary-900">Provider:</span>
                    <p className="text-secondary-700">{country.guide.workersComp.provider}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Compliance Requirements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-accent-600" />
                  Compliance Requirements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {country.guide.compliance.map((requirement: string, index: number) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-accent-600 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-secondary-700">{requirement}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Termination */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary-600" />
                  Termination & Dismissal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="font-semibold text-secondary-900">Notice Periods:</span>
                  <p className="text-secondary-700">{country.guide.termination.notice}</p>
                </div>
                <div>
                  <span className="font-semibold text-secondary-900">Severance Pay:</span>
                  <p className="text-secondary-700">{country.guide.termination.severance}</p>
                </div>
                <div>
                  <span className="font-semibold text-secondary-900">Unfair Dismissal Protection:</span>
                  <p className="text-secondary-700">{country.guide.termination.unfairDismissal}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        {/* Back to Resources */}
        <div className="mb-8">
          <Link href="/resources">
            <Button variant="ghost" className="text-primary-600 hover:text-primary-700">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Resources
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-secondary-900 mb-6">Country Employment Guides</h1>
          <p className="text-xl text-secondary-600 max-w-3xl mx-auto">
            Comprehensive employment guides covering laws, regulations, mandatory benefits, and compliance requirements for 17 countries.
          </p>
        </div>

        {/* Country Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {COUNTRIES.map((country: any) => (
            <Card 
              key={country.id}
              className="border-secondary-200 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer group"
              onClick={() => setSelectedCountry(country.id)}
            >
              <CardContent className="p-6 text-center">
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-200">
                  {country.flag}
                </div>
                <h3 className="text-lg font-bold text-secondary-900 mb-2 group-hover:text-primary-600 transition-colors">
                  {country.name}
                </h3>
                <div className="space-y-2 text-sm text-secondary-600">
                  <div className="flex items-center justify-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    <span>{country.currency}</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{country.workingHours}</span>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-4 group-hover:bg-primary-600 group-hover:text-white group-hover:border-primary-600 transition-colors"
                >
                  View Guide
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Features */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-secondary-900 mb-8">What's Included in Each Guide</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-primary-200">
              <CardContent className="p-6 text-center">
                <Shield className="w-8 h-8 text-primary-600 mx-auto mb-3" />
                <h3 className="font-semibold text-secondary-900 mb-2">Employment Laws</h3>
                <p className="text-sm text-secondary-600">Key legislation and regulatory framework</p>
              </CardContent>
            </Card>
            <Card className="border-accent-200">
              <CardContent className="p-6 text-center">
                <DollarSign className="w-8 h-8 text-accent-600 mx-auto mb-3" />
                <h3 className="font-semibold text-secondary-900 mb-2">Mandatory Benefits</h3>
                <p className="text-sm text-secondary-600">Required employer contributions and benefits</p>
              </CardContent>
            </Card>
            <Card className="border-secondary-200">
              <CardContent className="p-6 text-center">
                <AlertCircle className="w-8 h-8 text-secondary-600 mx-auto mb-3" />
                <h3 className="font-semibold text-secondary-900 mb-2">Compliance</h3>
                <p className="text-sm text-secondary-600">Registration, reporting, and ongoing requirements</p>
              </CardContent>
            </Card>
            <Card className="border-primary-200">
              <CardContent className="p-6 text-center">
                <FileText className="w-8 h-8 text-primary-600 mx-auto mb-3" />
                <h3 className="font-semibold text-secondary-900 mb-2">Best Practices</h3>
                <p className="text-sm text-secondary-600">Termination procedures and worker protections</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Casual Employment Comparative Guide */}
        <div className="mt-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-secondary-900 mb-4">Casual & Flexible Employment Guide</h2>
            <p className="text-lg text-secondary-600 max-w-4xl mx-auto">
              Comparative overview of how casual employment, zero-hours contracts, and flexible work arrangements 
              operate across our supported countries. Understanding these differences is crucial for global workforce planning.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-12">
            {/* Australia */}
            <Card className="border-l-4 border-l-green-500">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🇦🇺</span>
                  <CardTitle className="text-lg">Australia</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-sm font-semibold text-green-800">Formal Casual Employment</p>
                    <p className="text-xs text-green-700">Strong legislative framework</p>
                  </div>
                  <ul className="text-sm text-secondary-700 space-y-2">
                    <li>• No guaranteed hours, can decline shifts</li>
                    <li>• 25% casual loading instead of paid leave</li>
                    <li>• One of few countries with legislated casual category</li>
                    <li>• Termination flexibility for both parties</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* New Zealand */}
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🇳🇿</span>
                  <CardTitle className="text-lg">New Zealand</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm font-semibold text-blue-800">Casual Employment Agreements</p>
                    <p className="text-xs text-blue-700">Similar to Australia</p>
                  </div>
                  <ul className="text-sm text-secondary-700 space-y-2">
                    <li>• No guaranteed hours, as-needed basis</li>
                    <li>• Higher hourly rate instead of leave entitlements</li>
                    <li>• 8% holiday pay added on top of wages</li>
                    <li>• Flexible employment arrangements</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* United Kingdom */}
            <Card className="border-l-4 border-l-orange-500">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🇬🇧</span>
                  <CardTitle className="text-lg">United Kingdom</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <p className="text-sm font-semibold text-orange-800">Zero-Hours Contracts</p>
                    <p className="text-xs text-orange-700">Controversial but legal</p>
                  </div>
                  <ul className="text-sm text-secondary-700 space-y-2">
                    <li>• No guarantee of work hours</li>
                    <li>• Employer calls when needed</li>
                    <li>• Entitled to annual leave and minimum wage</li>
                    <li>• Job insecurity concerns</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* United States */}
            <Card className="border-l-4 border-l-red-500">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🇺🇸</span>
                  <CardTitle className="text-lg">United States</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="bg-red-50 p-3 rounded-lg">
                    <p className="text-sm font-semibold text-red-800">At-Will & Gig Work</p>
                    <p className="text-xs text-red-700">No formal casual category</p>
                  </div>
                  <ul className="text-sm text-secondary-700 space-y-2">
                    <li>• Employment generally at-will</li>
                    <li>• Part-time, temporary, gig work available</li>
                    <li>• No casual loading mandate</li>
                    <li>• Benefits depend on employer</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Philippines */}
            <Card className="border-l-4 border-l-purple-500">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🇵🇭</span>
                  <CardTitle className="text-lg">Philippines</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <p className="text-sm font-semibold text-purple-800">Casual Employment</p>
                    <p className="text-xs text-purple-700">Different legal definition</p>
                  </div>
                  <ul className="text-sm text-secondary-700 space-y-2">
                    <li>• Work not usually necessary to business</li>
                    <li>• Limited to 1 year maximum</li>
                    <li>• Becomes regular if role is continuous</li>
                    <li>• Daily-rate arrangements common</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Japan */}
            <Card className="border-l-4 border-l-pink-500">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🇯🇵</span>
                  <CardTitle className="text-lg">Japan</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="bg-pink-50 p-3 rounded-lg">
                    <p className="text-sm font-semibold text-pink-800">Part-time (Arubaito)</p>
                    <p className="text-xs text-pink-700">No casual like Australia</p>
                  </div>
                  <ul className="text-sm text-secondary-700 space-y-2">
                    <li>• Uses part-time or fixed-term contracts</li>
                    <li>• Some protections if hour thresholds met</li>
                    <li>• Lifetime employment traditions influence</li>
                    <li>• Non-regular work has grown</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Canada */}
            <Card className="border-l-4 border-l-indigo-500">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🇨🇦</span>
                  <CardTitle className="text-lg">Canada</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="bg-indigo-50 p-3 rounded-lg">
                    <p className="text-sm font-semibold text-indigo-800">On-Call & Seasonal</p>
                    <p className="text-xs text-indigo-700">No specific casual category</p>
                  </div>
                  <ul className="text-sm text-secondary-700 space-y-2">
                    <li>• Part-time, temporary, seasonal options</li>
                    <li>• Entitled to minimum employment standards</li>
                    <li>• Vacation pay and public holidays</li>
                    <li>• Provincial regulations vary</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Singapore */}
            <Card className="border-l-4 border-l-teal-500">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🇸🇬</span>
                  <CardTitle className="text-lg">Singapore</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="bg-teal-50 p-3 rounded-lg">
                    <p className="text-sm font-semibold text-teal-800">Part-time & Temporary</p>
                    <p className="text-xs text-teal-700">No distinct casual category</p>
                  </div>
                  <ul className="text-sm text-secondary-700 space-y-2">
                    <li>• Part-time less than 35 hours/week</li>
                    <li>• Casual/daily workers limited rights</li>
                    <li>• Benefits accrue if employed ≥3 months</li>
                    <li>• Temporary contracts available</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Ireland */}
            <Card className="border-l-4 border-l-emerald-500">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🇮🇪</span>
                  <CardTitle className="text-lg">Ireland</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="bg-emerald-50 p-3 rounded-lg">
                    <p className="text-sm font-semibold text-emerald-800">Casual Part-time</p>
                    <p className="text-xs text-emerald-700">Restricted zero-hours</p>
                  </div>
                  <ul className="text-sm text-secondary-700 space-y-2">
                    <li>• "Banded hours contract" after 12 months</li>
                    <li>• Zero-hours contracts restricted</li>
                    <li>• Less flexible than Australia/NZ</li>
                    <li>• Worker protection reforms</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Key Takeaways */}
          <Card className="bg-gradient-to-br from-primary-50 to-accent-50 border-primary-200">
            <CardHeader>
              <CardTitle className="text-xl text-center">🔑 Key Takeaways for Global Workforce Planning</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-green-600 font-bold">🇦🇺🇳🇿</span>
                  </div>
                  <h4 className="font-semibold text-secondary-900 mb-2">Closest to Australia</h4>
                  <p className="text-sm text-secondary-600">
                    New Zealand, UK, Philippines offer similar flexible arrangements 
                    though with different legal frameworks
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-blue-600 font-bold">🇺🇸🇬🇧</span>
                  </div>
                  <h4 className="font-semibold text-secondary-900 mb-2">Similar Flexibility</h4>
                  <p className="text-sm text-secondary-600">
                    UK (zero-hours), US (gig/at-will), Canada, Hong Kong, 
                    Singapore offer flexibility but no casual loading
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-purple-600 font-bold">🏆</span>
                  </div>
                  <h4 className="font-semibold text-secondary-900 mb-2">Australia is Unique</h4>
                  <p className="text-sm text-secondary-600">
                    Only Australia has a strong legislated "casual" category 
                    with mandated casual loading compensation
                  </p>
                </div>
              </div>
              
              <div className="mt-8 p-4 bg-white rounded-lg border border-primary-200">
                <p className="text-sm text-secondary-700 text-center">
                  <strong>Important:</strong> This information is for general guidance only. 
                  Employment laws change frequently and vary by jurisdiction. Always consult 
                  with local employment law experts for specific situations and current regulations.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}