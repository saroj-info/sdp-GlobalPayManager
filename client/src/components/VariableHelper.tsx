import { useState, type ComponentType } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, ChevronDown, ChevronRight, HelpCircle, Building2, User, FileText, Landmark } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VariableGroup {
  category: string;
  icon: ComponentType<{ className?: string }>;
  description: string;
  variables: Array<{
    name: string;
    description: string;
    example: string;
  }>;
}

const TEMPLATE_VARIABLES: VariableGroup[] = [
  {
    category: 'SDP Entity Details',
    icon: Landmark,
    description: 'Information about the SDP entity in the country of work',
    variables: [
      { name: 'sdpEntityName', description: 'Legal name of SDP entity', example: 'SDP SOLUTIONS LTD' },
      { name: 'sdpEntityAddress', description: 'Full business address of SDP entity', example: '123 Business Street, Auckland, New Zealand' },
      { name: 'sdpEntityTaxId', description: 'Tax identification number', example: '123-456-789' },
      { name: 'sdpEntityVatNumber', description: 'VAT/GST registration number', example: 'GB123456789' },
      { name: 'sdpEntityPhone', description: 'SDP entity contact phone', example: '+64 9 123 4567' },
      { name: 'sdpEntityEmail', description: 'SDP entity contact email', example: 'admin@sdpsolutions.com.au' },
      { name: 'sdpEntityBankName', description: 'Bank name for payments', example: 'ANZ Bank' },
      { name: 'sdpEntityBankAccount', description: 'Bank account number', example: '12-3456-7890123-00' },
      { name: 'sdpEntitySwiftCode', description: 'SWIFT/BIC code for international transfers', example: 'ANZBAU3M' },
    ],
  },
  {
    category: 'Business Details',
    icon: Building2,
    description: 'Information about the client business hiring the worker',
    variables: [
      { name: 'businessName', description: 'Legal business name', example: 'Kirk Crew Pty Ltd' },
      { name: 'businessAddress', description: 'Business address', example: '456 Corporate Ave, Sydney, NSW 2000' },
      { name: 'businessAbn', description: 'Australian Business Number (if applicable)', example: '12 345 678 901' },
      { name: 'businessPhone', description: 'Business contact phone', example: '+61 2 9876 5432' },
      { name: 'businessEmail', description: 'Business contact email', example: 'hr@kirkcrew.com.au' },
      { name: 'businessContactPerson', description: 'Primary contact person', example: 'Jane Smith' },
      { name: 'businessContactTitle', description: 'Contact person job title', example: 'HR Manager' },
    ],
  },
  {
    category: 'Worker Details',
    icon: User,
    description: 'Information about the worker being contracted',
    variables: [
      { name: 'workerName', description: 'Full name of worker', example: 'John Michael Doe' },
      { name: 'workerFirstName', description: 'Worker first name', example: 'John' },
      { name: 'workerLastName', description: 'Worker last name', example: 'Doe' },
      { name: 'workerEmail', description: 'Worker email address', example: 'john.doe@email.com' },
      { name: 'workerPhone', description: 'Worker phone number', example: '+61 4 1234 5678' },
      { name: 'workerAddress', description: 'Worker residential address', example: '789 Residential St, Melbourne, VIC 3000' },
      { name: 'workerDateOfBirth', description: 'Worker date of birth', example: '1990-05-15' },
      { name: 'workerTaxFileNumber', description: 'Tax file number (if applicable)', example: '123 456 789' },
      { name: 'workerBankName', description: 'Worker bank name', example: 'Commonwealth Bank' },
      { name: 'workerBankAccount', description: 'Worker bank account', example: '123456789' },
      { name: 'workerBsb', description: 'Bank BSB code (if applicable)', example: '062-001' },
    ],
  },
  {
    category: 'Contract Details',
    icon: FileText,
    description: 'Specific terms and details of the contract',
    variables: [
      { name: 'contractTitle', description: 'Contract job title/position', example: 'Senior Software Developer' },
      { name: 'contractType', description: 'Employment type', example: 'Fixed Term Contract' },
      { name: 'startDate', description: 'Contract start date', example: '2024-01-15' },
      { name: 'endDate', description: 'Contract end date (if applicable)', example: '2024-12-31' },
      { name: 'salaryAmount', description: 'Salary or rate amount', example: '150000' },
      { name: 'currency', description: 'Currency code', example: 'AUD' },
      { name: 'rateType', description: 'How salary is calculated', example: 'per annum' },
      { name: 'workLocation', description: 'Primary work location', example: 'Sydney Office / Remote' },
      { name: 'reportingManager', description: 'Direct manager name', example: 'Sarah Johnson' },
      { name: 'department', description: 'Department or team', example: 'Technology' },
      { name: 'probationPeriod', description: 'Probation period duration', example: '3 months' },
      { name: 'noticePeriod', description: 'Required notice period', example: '4 weeks' },
      { name: 'holidayEntitlement', description: 'Annual leave entitlement', example: '20 days' },
    ],
  },
];

interface VariableHelperProps {
  onVariableSelect?: (variable: string) => void;
  compact?: boolean;
}

export function VariableHelper({ onVariableSelect, compact = false }: VariableHelperProps) {
  const [openGroups, setOpenGroups] = useState<string[]>(['SDP Entity Details']);
  const { toast } = useToast();

  const toggleGroup = (category: string) => {
    setOpenGroups(prev => 
      prev.includes(category) 
        ? prev.filter(g => g !== category)
        : [...prev, category]
    );
  };

  const copyVariable = (variableName: string) => {
    const variableText = `{{${variableName}}}`;
    navigator.clipboard.writeText(variableText);
    toast({
      title: "Variable Copied",
      description: `{{${variableName}}} copied to clipboard`,
    });
  };

  const selectVariable = (variableName: string) => {
    if (onVariableSelect) {
      onVariableSelect(`{{${variableName}}}`);
    } else {
      copyVariable(variableName);
    }
  };

  if (compact) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm">Template Variables</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-32">
            <div className="grid grid-cols-2 gap-1">
              {TEMPLATE_VARIABLES.flatMap(group => 
                group.variables.map(variable => (
                  <Button
                    key={variable.name}
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="justify-start h-auto p-1 text-xs"
                    onClick={() => selectVariable(variable.name)}
                    data-testid={`variable-${variable.name}`}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    {variable.name}
                  </Button>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Template Variables Helper</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Click any variable to copy it to your clipboard. Use these variables in your contract template by wrapping them in double curly braces.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {TEMPLATE_VARIABLES.map((group) => {
            const Icon = group.icon;
            const isOpen = openGroups.includes(group.category);
            
            return (
              <Collapsible
                key={group.category}
                open={isOpen}
                onOpenChange={() => toggleGroup(group.category)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full justify-between p-3 h-auto whitespace-normal text-left"
                    data-testid={`group-${group.category.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <div className="text-left min-w-0 flex-1">
                        <div className="font-medium break-words">{group.category}</div>
                        <div className="text-xs text-muted-foreground break-words whitespace-normal">{group.description}</div>
                      </div>
                    </div>
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 flex-shrink-0 ml-2" />
                    ) : (
                      <ChevronRight className="h-4 w-4 flex-shrink-0 ml-2" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                
                <CollapsibleContent className="pl-2 pt-2">
                  <div className="grid gap-2">
                    {group.variables.map((variable) => (
                      <div
                        key={variable.name}
                        className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer group"
                        onClick={(e) => {
                          e.preventDefault();
                          selectVariable(variable.name);
                        }}
                        data-testid={`variable-${variable.name}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="font-mono text-xs break-all">
                              {`{{${variable.name}}}`}
                            </Badge>
                            <span className="text-sm font-medium break-words">{variable.description}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 break-words">
                            Example: {variable.example}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 h-7 w-7 p-0"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            copyVariable(variable.name);
                          }}
                          data-testid={`button-copy-${variable.name}`}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}