import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import {
  Sparkles,
  Send,
  User as UserIcon,
  Bot,
  Loader2,
  Pencil,
  Check as CheckIcon,
  X as XIcon,
  CheckCircle2,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { WorkerCombobox } from "@/components/pickers/WorkerCombobox";
import { BusinessCombobox } from "@/components/pickers/BusinessCombobox";
import { useAuthenticatedLayout } from "@/contexts/AuthenticatedLayoutContext";
import { useAuth } from "@/hooks/useAuth";

interface AiContractChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface PendingQuestion {
  fieldPath: string;
  question: string;
  candidates?: Array<{ id: string; label: string; hint?: string }>;
}

interface ChecklistState {
  required: string[];
  conditional: string[];
  optionalRecommended: string[];
}

interface ChatResponse {
  assistantMessage: string;
  proposedFormData: Record<string, any>;
  pendingQuestions: PendingQuestion[];
  aiFilledFieldPaths: string[];
  nextSteps?: ChecklistState;
}

// Human labels for every wizard-tracked field the AI can fill. Used both by
// the draft preview and the "Still needed" checklist. Labels match the manual
// wizard's UI verbatim (contract-wizard-modal.tsx) so the chat question
// vocabulary matches what the user sees in the draft preview and on Edit.
const FIELD_LABEL: Record<string, string> = {
  workerId: "Worker",
  selectedBusinessId: "Business",
  onBehalf: "Creating on behalf of a business",
  thirdPartyBusinessId: "Third-party vendor",
  sdpEntityId: "SDP entity",
  contractName: "Contract Name",
  countryId: "Work Location",
  employmentType: "Engagement Type",
  roleTitleId: "Role Title",
  customRoleTitle: "Custom Role Title",
  roleDescription: "Role Description",
  templateId: "Contract Template",
  contractorCompliance: "Contractor Compliance Service",
  noticePeriodDays: "Notice Period (Days)",
  rateType: "Pay Mode",
  rate: "Worker Rate",
  currency: "Currency",
  rateStructure: "Rate Structure",
  totalPackageValue: "Total Annual Package (CTC)",
  remunerationLines: "Remuneration lines",
  startDate: "Start Date",
  endDate: "End Date",
  requiresTimesheet: "Worker must submit timesheets",
  timesheetFrequency: "Timesheet Frequency",
  timesheetCalculationMethod: "Period Calculation Method",
  timesheetApproverRole: "Who approves submitted timesheets?",
  paymentScheduleType: "Payment Schedule",
  paymentDay: "Specific Payment Day",
  paymentDaysAfterPeriod: "Days After Period End",
  paymentHolidayRule: "Pay on previous working day if holiday",
  isForClient: "Work Arrangement",
  customerBusinessId: "Host Client",
  clientName: "Host Client Name (Auto-filled)",
  clientContactName: "Contact Name",
  clientAddress: "Address",
  clientCity: "Client City",
  clientCountry: "Client Country",
  clientContactEmail: "Contact Email (Auto-filled)",
  clientContactPhone: "Client Contact Phone",
  billingMode: "Customer Invoicing",
  invoiceCustomer: "Invoice customer",
  clientBillingType: "Billing Type",
  customerBillingRate: "Client Rate",
  customerBillingRateType: "Billing Basis",
  customerCurrency: "Client Currency",
  fixedBillingAmount: "Fixed Billing Amount",
  fixedBillingFrequency: "Billing Frequency",
  invoicingFrequency: "Invoicing Frequency",
  paymentTerms: "Payment Terms (Days)",
  projectRateLines: "Multiple Rate Lines",
  purchaseOrderLines: "PO / SOW Lines",
};

const labelOf = (key: string) => FIELD_LABEL[key] ?? key;

// Four steps mirroring the manual wizard's data-entry steps. The AI is told
// about these via the primer's STEPPED CONVERSATION block and per-turn
// "currentStep" annotation, so its questions bias toward the current step.
// Extraction remains unbounded — later-step values land in the draft and
// stay hidden until we advance to that step.
type StepNumber = 1 | 2 | 3 | 4;
type StepDef = {
  step: StepNumber;
  title: string;
  fields: string[];
  // Draft-side required-field predicate. Mirrors the server's computeChecklist
  // rules relevant to this step so the client can decide "is this step done"
  // without a server round-trip (empty checklist on fresh modal doesn't lie).
  required: (draft: Record<string, any>, userType: string | undefined) => string[];
  // Curated list of field keys to always render as rows in the CURRENT step's
  // body — filled or not. Empty values show a "Not set" placeholder so the
  // user can see what the step is asking for before typing anything.
  displayFields: (draft: Record<string, any>, userType: string | undefined) => string[];
};

const STEP_DEFS: StepDef[] = [
  {
    step: 1,
    title: "Worker & Location",
    fields: [
      "workerId",
      "selectedBusinessId",
      "onBehalf",
      "countryId",
      "employmentType",
      "contractorCompliance",
      "thirdPartyBusinessId",
      "sdpEntityId",
      "contractName",
    ],
    required: (_draft, userType) => {
      const base = ["workerId", "countryId", "employmentType"];
      if (userType === "sdp_internal") base.push("selectedBusinessId");
      return base;
    },
    displayFields: (draft, userType) => {
      const list: string[] = ["workerId"];
      if (userType === "sdp_internal") list.push("selectedBusinessId");
      list.push("countryId", "employmentType");
      // Show extra Step-1 fields only if the AI/user has already set them, so
      // the empty state stays clean.
      for (const k of ["onBehalf", "contractorCompliance", "thirdPartyBusinessId", "sdpEntityId", "contractName"]) {
        if (hasValue(draft[k])) list.push(k);
      }
      return list;
    },
  },
  {
    step: 2,
    title: "Customer Details",
    fields: [
      "isForClient",
      "customerBusinessId",
      "clientName",
      "clientContactName",
      "clientContactEmail",
      "clientAddress",
      "clientCity",
      "clientCountry",
      "clientContactPhone",
    ],
    // isForClient must be resolved before we can call Step 2 complete.
    // Returning it here (for undefined) makes draftMissing=true in
    // isStepComplete. stepIsSkipped upstream short-circuits the false case.
    required: (draft) => {
      if (draft.isForClient !== true) return ["isForClient"];
      if (hasValue(draft.customerBusinessId)) return [];
      return ["clientName", "clientContactEmail", "clientAddress"];
    },
    displayFields: (draft) => {
      const list: string[] = ["isForClient"];
      if (draft.isForClient !== true) return list;
      if (hasValue(draft.customerBusinessId)) {
        list.push("customerBusinessId");
        return list;
      }
      list.push("clientName", "clientContactName", "clientContactEmail", "clientAddress");
      // Optional address extras — shown only if already set to keep the
      // create-new-host-client rows focused.
      for (const k of ["clientCity", "clientCountry", "clientContactPhone"]) {
        if (hasValue(draft[k])) list.push(k);
      }
      return list;
    },
  },
  {
    step: 3,
    title: "Billing Setup",
    fields: [
      "billingMode",
      "invoiceCustomer",
      "clientBillingType",
      "customerBillingRate",
      "customerBillingRateType",
      "customerCurrency",
      "fixedBillingAmount",
      "fixedBillingFrequency",
      "invoicingFrequency",
      "paymentTerms",
    ],
    required: (draft) => {
      if (draft.isForClient !== true) return ["isForClient"];
      // invoicingFrequency is auto-set to "monthly" on Create; the wizard has
      // no user input for it either. Omit from the client's step-complete check.
      const list: string[] = ["billingMode", "clientBillingType", "paymentTerms"];
      if (draft.clientBillingType === "rate_based") {
        list.push("customerBillingRate", "customerBillingRateType", "customerCurrency");
      } else if (draft.clientBillingType === "fixed_price") {
        list.push("fixedBillingAmount", "fixedBillingFrequency");
      }
      return list;
    },
    displayFields: (draft) => {
      const list: string[] = ["billingMode", "clientBillingType"];
      if (draft.clientBillingType === "rate_based") {
        list.push("customerBillingRate", "customerBillingRateType", "customerCurrency");
      } else if (draft.clientBillingType === "fixed_price") {
        list.push("fixedBillingAmount", "fixedBillingFrequency");
      }
      // invoicingFrequency intentionally omitted — the manual wizard doesn't
      // expose it either; createContractMutation forces "monthly" on Create.
      list.push("paymentTerms");
      return list;
    },
  },
  {
    step: 4,
    title: "Contract Details",
    fields: [
      "customRoleTitle",
      "roleTitleId",
      "roleDescription",
      "templateId",
      "startDate",
      "endDate",
      "rateType",
      "rate",
      "currency",
      "rateStructure",
      "totalPackageValue",
      "remunerationLines",
      "projectRateLines",
      "purchaseOrderLines",
      "requiresTimesheet",
      "timesheetFrequency",
      "timesheetCalculationMethod",
      "timesheetApproverRole",
      "paymentScheduleType",
      "paymentDay",
      "paymentDaysAfterPeriod",
      "paymentHolidayRule",
      "noticePeriodDays",
    ],
    required: (draft) => {
      const list: string[] = ["roleDescription", "templateId", "startDate", "rateType", "rate", "currency"];
      const requiresTimesheet =
        draft.requiresTimesheet === true ||
        draft.rateType === "hourly" ||
        draft.rateType === "daily";
      if (requiresTimesheet) {
        list.push("timesheetFrequency", "timesheetApproverRole", "paymentScheduleType");
        if (draft.paymentScheduleType === "specific_day") list.push("paymentDay");
        if (draft.paymentScheduleType === "days_after") list.push("paymentDaysAfterPeriod");
      }
      if (draft.employmentType === "casual" || draft.employmentType === "fixed_term") {
        list.push("endDate");
      }
      return list;
    },
    displayFields: (draft) => {
      const list: string[] = [
        "templateId",
        "roleTitleId",
        "roleDescription",
        "startDate",
        "endDate",
        "rateType",
        "rateStructure",
        "rate",
        "currency",
      ];
      // Show totalPackageValue only when relevant (annual rateType).
      if (draft.rateType === "annual" || hasValue(draft.totalPackageValue)) {
        list.push("totalPackageValue");
      }
      // Show customRoleTitle when the user has typed one (roleTitleId===null path).
      if (hasValue(draft.customRoleTitle)) list.push("customRoleTitle");
      list.push("requiresTimesheet");
      const requiresTimesheet =
        draft.requiresTimesheet === true ||
        draft.rateType === "hourly" ||
        draft.rateType === "daily";
      if (requiresTimesheet) {
        list.push("timesheetFrequency", "timesheetApproverRole", "paymentScheduleType");
        if (draft.paymentScheduleType === "specific_day") list.push("paymentDay");
        if (draft.paymentScheduleType === "days_after") list.push("paymentDaysAfterPeriod");
      }
      list.push("noticePeriodDays");
      // Show any other Step-4 fields the AI has set that aren't already in the list.
      // remunerationLines / projectRateLines / purchaseOrderLines are complex
      // arrays — never render placeholder rows for them; only show when set.
      for (const k of ["remunerationLines", "projectRateLines", "purchaseOrderLines", "timesheetCalculationMethod", "paymentHolidayRule"]) {
        if (hasValue(draft[k]) && !list.includes(k)) list.push(k);
      }
      return list;
    },
  },
];

// Step 2/3 collapse to "not applicable" ONLY when the user (or AI) has
// definitively committed isForClient=false. An undefined value means the
// client-vs-internal question hasn't been answered yet — those steps stay
// pending, not silently skipped-with-a-checkmark.
const stepIsSkipped = (step: StepNumber, draft: Record<string, any>): boolean =>
  (step === 2 || step === 3) && draft.isForClient === false;

// Step completeness — a step is complete when (a) every draft-required field
// for that step is filled AND (b) no server-side checklist entry overlaps
// with the step's field set. AND-ing both signals keeps the stepper honest
// on a fresh modal (server checklist is [], but draft is empty too).
function isStepComplete(
  step: StepNumber,
  draft: Record<string, any>,
  nextSteps: ChecklistState,
  userType: string | undefined,
): boolean {
  if (stepIsSkipped(step, draft)) return true;
  const def = STEP_DEFS.find((s) => s.step === step);
  if (!def) return false;
  const draftMissing = def.required(draft, userType).some((k) => !hasValue(draft[k]));
  if (draftMissing) return false;
  const stepFields = new Set(def.fields);
  const stillNeeded = [...nextSteps.required, ...nextSteps.conditional];
  return stillNeeded.every((k) => !stepFields.has(k));
}

// Next step in the sequence, skipping non-applicable steps.
function nextStep(current: StepNumber, draft: Record<string, any>): StepNumber {
  let n = (current + 1) as number;
  while (n <= 4 && stepIsSkipped(n as StepNumber, draft)) n += 1;
  return (n > 4 ? 4 : n) as StepNumber;
}

type EditorType =
  | "text"
  | "number"
  | "date"
  | "textarea"
  | "checkbox"
  | "select"
  | "worker"
  | "business"
  | "country"
  | "template"
  | "roleTitle";

const FIELD_EDITOR: Record<string, { type: EditorType; options?: string[] }> = {
  contractName: { type: "text" },
  clientName: { type: "text" },
  clientContactName: { type: "text" },
  clientAddress: { type: "text" },
  clientCity: { type: "text" },
  clientCountry: { type: "text" },
  clientContactEmail: { type: "text" },
  clientContactPhone: { type: "text" },
  customRoleTitle: { type: "text" },
  sdpEntityId: { type: "text" },
  timesheetCalculationMethod: { type: "text" },
  rate: { type: "number" },
  totalPackageValue: { type: "number" },
  customerBillingRate: { type: "number" },
  fixedBillingAmount: { type: "number" },
  noticePeriodDays: { type: "number" },
  paymentDaysAfterPeriod: { type: "number" },
  startDate: { type: "date" },
  endDate: { type: "date" },
  roleDescription: { type: "textarea" },
  onBehalf: { type: "checkbox" },
  contractorCompliance: { type: "checkbox" },
  requiresTimesheet: { type: "checkbox" },
  isForClient: { type: "checkbox" },
  invoiceCustomer: { type: "checkbox" },
  paymentHolidayRule: { type: "checkbox" },
  employmentType: {
    type: "select",
    // Wizard's engagementType list (contract-wizard-modal.tsx:732-821). "employee"
    // is NOT a valid backend enum — use "permanent" for salaried employees.
    options: [
      "contractor",
      "permanent",
      "fixed_term",
      "casual",
      "zero_hours",
      "at_will",
      "gig_worker",
      "on_call",
      "seasonal",
      "part_time",
      "third_party_worker",
    ],
  },
  rateType: { type: "select", options: ["hourly", "daily", "annual"] },
  rateStructure: { type: "select", options: ["single", "multiple"] },
  currency: { type: "select", options: ["AUD", "NZD", "USD", "GBP", "SGD", "CAD", "EUR", "INR", "PHP", "JPY"] },
  customerCurrency: { type: "select", options: ["USD", "AUD", "GBP", "EUR", "CAD", "NZD", "SGD", "JPY"] },
  billingMode: {
    type: "select",
    // Includes "direct" for internal contracts (wizard sets this silently) so
    // the inline editor can round-trip a value the AI wrote for an
    // internal-work draft. Wizard's user-facing radios show only the other three.
    options: ["direct", "invoice_separately", "invoice_through_platform", "auto_invoice"],
  },
  clientBillingType: { type: "select", options: ["rate_based", "fixed_price"] },
  customerBillingRateType: { type: "select", options: ["hourly", "daily"] },
  fixedBillingFrequency: { type: "select", options: ["weekly", "fortnightly", "monthly", "per_project"] },
  paymentTerms: { type: "select", options: ["0", "7", "14", "30", "45", "60", "90"] },
  timesheetFrequency: { type: "select", options: ["weekly", "fortnightly", "semi_monthly", "monthly"] },
  paymentScheduleType: { type: "select", options: ["days_after", "specific_day"] },
  paymentDay: {
    type: "select",
    // DAY OF WEEK, mirroring the wizard's "Specific Payment Day" select
    // (contract-wizard-modal.tsx:2738-2757). Not a day-of-month number.
    options: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
  },
  timesheetApproverRole: { type: "select", options: ["sdp", "business", "host_client"] },
  workerId: { type: "worker" },
  selectedBusinessId: { type: "business" },
  customerBusinessId: { type: "business" },
  thirdPartyBusinessId: { type: "business" },
  countryId: { type: "country" },
  templateId: { type: "template" },
  roleTitleId: { type: "roleTitle" },
};

function hasValue(v: unknown): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

function displayValue(v: any): string {
  if (v === true) return "Yes";
  if (v === false) return "No";
  if (v === null || v === undefined || v === "") return "";
  return String(v);
}

function humanizeEnum(v: string): string {
  return v
    .split("_")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

const CUSTOM_ROLE_SENTINEL = "__custom_role__";

export function AiContractChatModal({ open, onOpenChange }: AiContractChatModalProps) {
  const { toast } = useToast();
  const { countries } = useAuthenticatedLayout();
  const { activeRole } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState<Record<string, any>>({});
  const [aiFilledFields, setAiFilledFields] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<PendingQuestion[]>([]);
  const [nextSteps, setNextSteps] = useState<ChecklistState>({ required: [], conditional: [], optionalRecommended: [] });
  // Flipped true the first time the AI turn resolves. Gates Create Contract
  // so a user can't click through on a fresh modal (where nextSteps is empty
  // by default — which would otherwise LOOK "ready").
  const [hasServerResponded, setHasServerResponded] = useState(false);
  const [input, setInput] = useState("");
  // Which step (1-4) the user is currently viewing. Mirrors the wizard's
  // 4 data-entry steps and is passed to the AI so questions bias toward it.
  const [activeStep, setActiveStep] = useState<StepNumber>(1);
  // Flipped true when the user manually navigates via a pill or past-summary
  // click. While true, auto-advance is disabled so a click-back doesn't get
  // yanked forward again. Reset on send (new turn resumes natural flow) and
  // on modal close.
  const [manuallyNavigated, setManuallyNavigated] = useState(false);
  // Mention state — active while a `@` (worker) or `#` (host client) popover
  // is open in the composer. Null when no popover is open.
  const [mention, setMention] = useState<
    | null
    | { type: "worker" | "hostClient"; triggerIndex: number; query: string }
  >(null);

  // Inline-edit state — one field open at a time keeps the mental model simple.
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<any>(undefined);

  // Cache of human labels for id-typed fields the user has picked in the
  // modal (worker, business, template, roleTitle). Countries live in the
  // authenticated-layout context; businesses/templates/role titles are
  // sourced from react-query below.
  const [resolvedRefs, setResolvedRefs] = useState<Record<string, string>>({});

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: businesses = [] } = useQuery<any[]>({
    queryKey: ["/api/businesses"],
    enabled: open,
  });

  const { data: roleTitles = [] } = useQuery<any[]>({
    queryKey: ["/api/role-titles"],
    enabled: open,
  });

  const templatesEnabled = !!draft.countryId && !!draft.employmentType;
  const { data: contractTemplates = [] } = useQuery<any[]>({
    queryKey: [`/api/contract-templates/country/${draft.countryId}?employmentType=${draft.employmentType}`],
    enabled: open && templatesEnabled,
  });

  // Worker search for the `@` mention popover in the composer. Fetches only
  // while the mention is active; scoped to draft.selectedBusinessId when set
  // (SDP-internal — otherwise the server derives scope from the JWT).
  const mentionWorkerBiz = typeof draft.selectedBusinessId === "string" ? draft.selectedBusinessId : undefined;
  const workerMentionQuery = useQuery<{ items: any[] }>({
    queryKey: [
      "/api/workers/list",
      { search: mention?.query ?? "", businessId: mentionWorkerBiz, pageSize: 8, mode: "mention" },
    ],
    queryFn: async () => {
      const qs = new URLSearchParams();
      qs.set("page", "1");
      qs.set("pageSize", "8");
      if (mention?.query) qs.set("search", mention.query);
      if (mentionWorkerBiz) qs.set("businessId", mentionWorkerBiz);
      return (await apiRequest("GET", `/api/workers/list?${qs.toString()}`)).json();
    },
    enabled: open && mention?.type === "worker",
  });

  // Host-clients list for the `#` mention popover. Small list — fetched once
  // and filtered client-side by mention.query.
  const { data: hostClientList = [] } = useQuery<any[]>({
    queryKey: ["/api/businesses/host-clients"],
    enabled: open && mention?.type === "hostClient",
  });

  // Reset when the modal is opened for a fresh session.
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content:
            "Hi! Describe the hire in a sentence or two — worker, country, rate, dates, whether it's for a client, anything you know. I'll fill what I can, then walk you through the rest. Tip: you can click any field on the right to edit it directly.",
        },
      ]);
    }
    if (!open) {
      setMessages([]);
      setDraft({});
      setAiFilledFields(new Set());
      setPending([]);
      setNextSteps({ required: [], conditional: [], optionalRecommended: [] });
      setHasServerResponded(false);
      setInput("");
      setEditingField(null);
      setEditValue(undefined);
      setResolvedRefs({});
      setActiveStep(1);
      setManuallyNavigated(false);
      setMention(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-advance: when the current step's required fields are satisfied, bump
  // to the next applicable step. Skips Steps 2 & 3 for internal contracts.
  useEffect(() => {
    if (manuallyNavigated) return;
    if (activeStep >= 4) return;
    if (isStepComplete(activeStep, draft, nextSteps, activeRole)) {
      const next = nextStep(activeStep, draft);
      if (next > activeStep) setActiveStep(next);
    }
  }, [activeStep, draft, nextSteps, activeRole, manuallyNavigated]);

  const sendMutation = useMutation({
    mutationFn: async ({ historySnapshot }: { historySnapshot: ChatMessage[] }) => {
      const resp = await apiRequest("POST", "/api/ai/contract-draft", {
        messages: historySnapshot,
        currentDraft: draft,
        currentStep: activeStep,
      });
      const data: ChatResponse = await resp.json();
      return data;
    },
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: "assistant", content: data.assistantMessage || "…" }]);
      setDraft((prev) => {
        const next = { ...prev };
        for (const [k, v] of Object.entries(data.proposedFormData || {})) {
          if (hasValue(prev[k])) continue;
          next[k] = v;
        }
        return next;
      });
      const filled = Array.isArray(data.aiFilledFieldPaths) ? data.aiFilledFieldPaths : [];
      setAiFilledFields((prev) => {
        const next = new Set(prev);
        filled.forEach((f) => next.add(f));
        return next;
      });
      setPending(Array.isArray(data.pendingQuestions) ? data.pendingQuestions : []);
      if (data.nextSteps) {
        setNextSteps({
          required: Array.isArray(data.nextSteps.required) ? data.nextSteps.required : [],
          conditional: Array.isArray(data.nextSteps.conditional) ? data.nextSteps.conditional : [],
          optionalRecommended: Array.isArray(data.nextSteps.optionalRecommended) ? data.nextSteps.optionalRecommended : [],
        });
      }
      // Now that the server has spoken, Create Contract can be gated on the
      // server's checklist instead of the initial empty state.
      setHasServerResponded(true);
      // A completed chat turn resumes the natural forward-flow of auto-advance;
      // any prior manual pin was for reviewing, not for pinning through a turn.
      setManuallyNavigated(false);
      requestAnimationFrame(() => textareaRef.current?.focus());
    },
    onError: (err: any) => {
      const msg = err?.message || "Try again in a moment.";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `I couldn't reach the AI service. ${msg}` },
      ]);
      toast({ title: "Couldn't reach the AI", description: msg, variant: "destructive" });
      requestAnimationFrame(() => textareaRef.current?.focus());
    },
  });

  const createContractMutation = useMutation({
    mutationFn: async () => {
      let effectiveDraft = draft;

      // If this is a client-facing contract and the host client hasn't been
      // resolved yet (AI only had a name, not a UUID), create the host client
      // first — mirroring the wizard's create-then-attach pattern in
      // contract-wizard-modal.tsx:96-128. Keeps the "no writes from the AI"
      // invariant intact — the write happens under a real user click.
      const needsHostClient =
        draft.isForClient === true &&
        !hasValue(draft.customerBusinessId) &&
        hasValue(draft.clientName);

      if (needsHostClient) {
        const hcPayload: Record<string, any> = {
          name: draft.clientName,
          contactEmail: draft.clientContactEmail || undefined,
          contactName: draft.clientContactName || undefined,
          address: draft.clientAddress || undefined,
        };
        // For business_user callers the server forces parentBusinessId from
        // the JWT; sdp_internal callers must supply it via selectedBusinessId.
        if (draft.selectedBusinessId) hcPayload.parentBusinessId = draft.selectedBusinessId;

        const hcResp = await apiRequest("POST", "/api/businesses/host-clients", hcPayload);
        const hostClient = await hcResp.json();
        // Mirror the freshly-created host client's snapshot fields back onto
        // the draft — clientName / clientContactEmail / clientAddress are
        // snapshot columns on the contract row read directly by the wizard's
        // edit view (no join fallback there).
        effectiveDraft = {
          ...draft,
          customerBusinessId: hostClient.id,
          clientName: draft.clientName || hostClient.name || "",
          clientContactEmail: draft.clientContactEmail || hostClient.contactEmail || "",
          clientAddress: draft.clientAddress || hostClient.address || "",
          ...(draft.clientContactName || hostClient.contactName
            ? { clientContactName: draft.clientContactName || hostClient.contactName }
            : {}),
        };
        // Persist in local state so a subsequent /api/contracts retry doesn't
        // re-create the host client.
        setDraft(effectiveDraft);
        setResolvedRefs((p) => ({ ...p, customerBusinessId: hostClient.name }));
        queryClient.invalidateQueries({ queryKey: ["/api/businesses/host-clients"] });
        queryClient.invalidateQueries({ queryKey: ["/api/businesses"] });
      }

      // Strip empty-string keys so the server's Zod coercions don't see them
      // as intentional values (matches the manual-edit pattern in the wizard).
      // Also strip fields that don't apply to the chosen branches — an earlier
      // draft turn may have set a client-billing or timesheet field before the
      // user flipped isForClient / requiresTimesheet, and sending stale values
      // would confuse the Edit view.
      const isInternal = effectiveDraft.isForClient === false;
      const timesheetOff =
        effectiveDraft.requiresTimesheet === false ||
        (effectiveDraft.requiresTimesheet !== true &&
          effectiveDraft.rateType !== "hourly" &&
          effectiveDraft.rateType !== "daily");
      const CLIENT_ONLY_FIELDS = new Set([
        "customerBusinessId",
        "clientName",
        "clientContactName",
        "clientContactEmail",
        "clientAddress",
        "clientCity",
        "clientCountry",
        "clientContactPhone",
        "clientBillingType",
        "customerBillingRate",
        "customerBillingRateType",
        "customerCurrency",
        "fixedBillingAmount",
        "fixedBillingFrequency",
        "invoicingFrequency",
        "invoiceCustomer",
        "paymentTerms",
      ]);
      const TIMESHEET_ONLY_FIELDS = new Set([
        "timesheetFrequency",
        "timesheetCalculationMethod",
        "timesheetApproverRole",
        "paymentScheduleType",
        "paymentDay",
        "paymentDaysAfterPeriod",
        "paymentHolidayRule",
      ]);
      const contractPayload: Record<string, any> = {};
      for (const [k, v] of Object.entries(effectiveDraft)) {
        if (v === "") continue;
        if (isInternal && CLIENT_ONLY_FIELDS.has(k)) continue;
        if (timesheetOff && TIMESHEET_ONLY_FIELDS.has(k)) continue;
        contractPayload[k] = v;
      }
      // Field-name parity with the wizard: the DB column is `jobDescription`,
      // but the AI drafts under `roleDescription`. The wizard maps at submit
      // (contract-wizard-modal.tsx:695); mirror that here so the description
      // actually persists to contracts.jobDescription AND flows into the
      // server's role_titles.description on upsert (server/routes.ts:6168).
      if (hasValue(contractPayload.roleDescription) && !hasValue(contractPayload.jobDescription)) {
        contractPayload.jobDescription = contractPayload.roleDescription;
      }
      delete contractPayload.roleDescription;
      // paymentTerms is a varchar column — Zod validates z.string(). The AI
      // sometimes returns a JSON number (7 instead of "7") which slips past
      // the sanitizer's typeof-string enum check. Coerce here so Create
      // Contract stops 400ing on that specific mismatch.
      if (typeof contractPayload.paymentTerms === "number") {
        contractPayload.paymentTerms = String(contractPayload.paymentTerms);
      }
      // Force billingMode="direct" for internal contracts (wizard does this
      // silently). Overrides anything a stale draft may have left behind.
      if (isInternal) {
        contractPayload.billingMode = "direct";
      } else if (effectiveDraft.isForClient === true && !contractPayload.invoicingFrequency) {
        // Wizard has no UI for invoicingFrequency; default silently to monthly
        // so the invoice-generation flow has a stable cadence.
        contractPayload.invoicingFrequency = "monthly";
      }
      const resp = await apiRequest("POST", "/api/contracts", contractPayload);
      return resp.json();
    },
    onSuccess: () => {
      toast({ title: "Contract created", description: "The AI-drafted contract has been saved." });
      queryClient.invalidateQueries({
        predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/contracts"),
      });
      onOpenChange(false);
    },
    onError: (err: any) => {
      const msg = err?.message || "Unknown error";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `The server rejected the draft: ${msg}\n\nCan you help me correct the missing or invalid fields?`,
        },
      ]);
      toast({ title: "Couldn't create contract", description: msg, variant: "destructive" });
    },
  });

  const serverGateReady = nextSteps.required.length === 0 && nextSteps.conditional.length === 0;
  // The server's checklist is authoritative — gate on it, but only after
  // it has actually spoken. Otherwise a fresh modal (empty nextSteps → looks
  // "ready") would let the user click Create with no draft.
  const canCreate = hasServerResponded && serverGateReady && !createContractMutation.isPending;

  const handleSend = () => {
    const text = input.trim();
    if (!text || sendMutation.isPending) return;
    const userTurn: ChatMessage = { role: "user", content: text };
    const historySnapshot = [...messages, userTurn];
    setMessages(historySnapshot);
    setInput("");
    requestAnimationFrame(() => textareaRef.current?.focus());
    sendMutation.mutate({ historySnapshot });
  };

  const detectMention = (value: string, cursor: number) => {
    if (mention) {
      // Backspaced past trigger → close.
      if (cursor <= mention.triggerIndex) {
        setMention(null);
        return;
      }
      // Trigger char removed by user → close.
      const triggerChar = value[mention.triggerIndex];
      if (triggerChar !== "@" && triggerChar !== "#") {
        setMention(null);
        return;
      }
      const query = value.slice(mention.triggerIndex + 1, cursor);
      // Whitespace terminates the mention (user typed a space to move on).
      if (/\s/.test(query)) {
        setMention(null);
        return;
      }
      setMention({ ...mention, query });
      return;
    }
    // No active mention — check for a fresh @/# at cursor-1 at a word boundary.
    if (cursor === 0) return;
    const char = value[cursor - 1];
    if (char !== "@" && char !== "#") return;
    const prev = cursor - 2 >= 0 ? value[cursor - 2] : null;
    if (prev !== null && !/\s/.test(prev)) return;
    setMention({
      type: char === "@" ? "worker" : "hostClient",
      triggerIndex: cursor - 1,
      query: "",
    });
  };

  const pickMentionWorker = (worker: any) => {
    const fullName = `${worker?.firstName ?? ""} ${worker?.lastName ?? ""}`.trim();
    if (!mention || !fullName) {
      setMention(null);
      return;
    }
    const before = input.slice(0, mention.triggerIndex);
    const after = input.slice(mention.triggerIndex + 1 + mention.query.length);
    const insert = `@${fullName} `;
    const caretPos = before.length + insert.length;
    setInput(before + insert + after);
    setDraft((d) => ({ ...d, workerId: worker.id }));
    setResolvedRefs((r) => ({ ...r, workerId: fullName }));
    setNextSteps((prev) => ({
      required: prev.required.filter((k) => k !== "workerId"),
      conditional: prev.conditional.filter((k) => k !== "workerId"),
      optionalRecommended: prev.optionalRecommended.filter((k) => k !== "workerId"),
    }));
    setAiFilledFields((prev) => {
      const next = new Set(prev);
      next.delete("workerId");
      return next;
    });
    setMention(null);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(caretPos, caretPos);
    });
  };

  const pickMentionHostClient = (client: any) => {
    const name = client?.name ?? "";
    if (!mention || !name) {
      setMention(null);
      return;
    }
    const before = input.slice(0, mention.triggerIndex);
    const after = input.slice(mention.triggerIndex + 1 + mention.query.length);
    const insert = `#${name} `;
    const caretPos = before.length + insert.length;
    setInput(before + insert + after);
    // Mirror the host-client's snapshot fields into the draft — the contract
    // row has clientName / clientContactEmail / clientAddress snapshot columns
    // that the wizard's edit view reads directly (no join fallback there).
    setDraft((d) => ({
      ...d,
      customerBusinessId: client.id,
      isForClient: true,
      clientName: client.name ?? d.clientName ?? "",
      ...(client.contactEmail ? { clientContactEmail: client.contactEmail } : {}),
      ...(client.address ? { clientAddress: client.address } : {}),
      ...(client.contactName ? { clientContactName: client.contactName } : {}),
    }));
    setResolvedRefs((r) => ({ ...r, customerBusinessId: name }));
    setNextSteps((prev) => ({
      required: prev.required.filter((k) => k !== "customerBusinessId" && k !== "isForClient"),
      conditional: prev.conditional.filter((k) => k !== "customerBusinessId" && k !== "isForClient"),
      optionalRecommended: prev.optionalRecommended.filter((k) => k !== "customerBusinessId" && k !== "isForClient"),
    }));
    setAiFilledFields((prev) => {
      const next = new Set(prev);
      next.delete("customerBusinessId");
      next.delete("isForClient");
      return next;
    });
    setMention(null);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(caretPos, caretPos);
    });
  };

  // Fallback for when the # popover has no matches — offer to create a new
  // host client from the typed query. Pre-populates the draft with
  // isForClient=true + clientName, jumps to Step 2 so the user can inline-fill
  // contactEmail + address, and the existing Create Contract handler will
  // POST /api/businesses/host-clients before /api/contracts.
  const pickMentionCreateNewHostClient = (name: string) => {
    if (!mention || !name.trim()) {
      setMention(null);
      return;
    }
    const clientName = name.trim();
    const before = input.slice(0, mention.triggerIndex);
    const after = input.slice(mention.triggerIndex + 1 + mention.query.length);
    const insert = `#${clientName} `;
    const caretPos = before.length + insert.length;
    setInput(before + insert + after);
    setDraft((d) => ({ ...d, isForClient: true, clientName }));
    setResolvedRefs((r) => ({ ...r, clientName }));
    setNextSteps((prev) => ({
      required: prev.required.filter((k) => k !== "isForClient"),
      conditional: prev.conditional.filter((k) => k !== "isForClient"),
      optionalRecommended: prev.optionalRecommended.filter((k) => k !== "isForClient"),
    }));
    setAiFilledFields((prev) => {
      const next = new Set(prev);
      next.delete("isForClient");
      next.delete("clientName");
      return next;
    });
    setMention(null);
    setActiveStep(2);
    setManuallyNavigated(true);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(caretPos, caretPos);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Mention popover intercepts Enter and Escape so the user doesn't
    // accidentally send while picking.
    if (mention) {
      if (e.key === "Escape") {
        e.preventDefault();
        setMention(null);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!sendMutation.isPending) handleSend();
    }
  };

  const beginEdit = (key: string) => {
    setEditingField(key);
    setEditValue(draft[key] ?? (FIELD_EDITOR[key]?.type === "checkbox" ? false : ""));
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue(undefined);
  };

  const commitField = (key: string, value: any, extra?: Record<string, any>) => {
    setDraft((prev) => ({ ...prev, [key]: value, ...(extra ?? {}) }));
    setNextSteps((prev) => ({
      required: prev.required.filter((k) => k !== key),
      conditional: prev.conditional.filter((k) => k !== key),
      optionalRecommended: prev.optionalRecommended.filter((k) => k !== key),
    }));
    setAiFilledFields((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    setEditingField(null);
    setEditValue(undefined);
  };

  const resolveLabel = (key: string, value: any): string => {
    if (value === undefined || value === null || value === "") return "";
    switch (key) {
      case "countryId": {
        const c = countries.find((x: any) => x.id === value);
        return c ? c.name || c.code || String(value) : String(value);
      }
      case "selectedBusinessId":
      case "customerBusinessId":
      case "thirdPartyBusinessId": {
        const b = businesses.find((x: any) => x.id === value);
        return b?.name ?? resolvedRefs[key] ?? String(value);
      }
      case "workerId":
        return resolvedRefs.workerId ?? String(value);
      case "templateId": {
        const t = contractTemplates.find((x: any) => x.id === value);
        return t?.name ?? resolvedRefs.templateId ?? String(value);
      }
      case "roleTitleId": {
        const r = roleTitles.find((x: any) => x.id === value);
        return r?.title ?? resolvedRefs.roleTitleId ?? String(value);
      }
      case "employmentType":
      case "rateType":
      case "rateStructure":
      case "billingMode":
      case "clientBillingType":
      case "customerBillingRateType":
      case "fixedBillingFrequency":
      case "timesheetFrequency":
      case "paymentScheduleType":
      case "timesheetApproverRole":
      case "paymentDay":
        return typeof value === "string" ? humanizeEnum(value) : displayValue(value);
      default:
        return displayValue(value);
    }
  };

  const renderEditor = (key: string) => {
    const editor = FIELD_EDITOR[key];
    if (!editor) return null;

    switch (editor.type) {
      case "text":
      case "number":
      case "date": {
        const type = editor.type;
        return (
          <div className="flex items-center gap-1 w-full">
            <Input
              type={type}
              value={editValue ?? ""}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitField(key, editValue);
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  cancelEdit();
                }
              }}
              autoFocus
              className="h-8 text-sm"
              data-testid={`edit-input-${key}`}
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 shrink-0 text-primary"
              onClick={() => commitField(key, editValue)}
              data-testid={`edit-save-${key}`}
            >
              <CheckIcon className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 shrink-0 text-muted-foreground"
              onClick={cancelEdit}
              data-testid={`edit-cancel-${key}`}
            >
              <XIcon className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      }
      case "textarea": {
        return (
          <div className="w-full space-y-1">
            <Textarea
              value={editValue ?? ""}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  cancelEdit();
                }
              }}
              autoFocus
              rows={3}
              className="text-sm resize-none"
              data-testid={`edit-input-${key}`}
            />
            <div className="flex justify-end gap-1">
              <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-7 text-xs">
                Cancel
              </Button>
              <Button size="sm" onClick={() => commitField(key, editValue)} className="h-7 text-xs">
                Save
              </Button>
            </div>
          </div>
        );
      }
      case "checkbox": {
        return (
          <div className="flex items-center gap-2">
            <Checkbox
              checked={editValue === true}
              onCheckedChange={(v) => commitField(key, v === true)}
              data-testid={`edit-input-${key}`}
            />
            <span className="text-xs text-muted-foreground">{editValue === true ? "Yes" : "No"}</span>
            <Button size="icon" variant="ghost" className="h-6 w-6 ml-auto" onClick={cancelEdit}>
              <XIcon className="h-3 w-3" />
            </Button>
          </div>
        );
      }
      case "select": {
        const opts = editor.options ?? [];
        return (
          <Select
            defaultOpen
            defaultValue={typeof editValue === "string" ? editValue : undefined}
            onValueChange={(v) => commitField(key, v)}
            onOpenChange={(o) => {
              if (!o && editingField === key) cancelEdit();
            }}
          >
            <SelectTrigger className="h-8 text-sm" data-testid={`edit-input-${key}`}>
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              {opts.map((o) => (
                <SelectItem key={o} value={o}>
                  {humanizeEnum(o)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
      case "worker": {
        const seededWorkerLabel = resolvedRefs.workerId;
        const [firstName, ...rest] = (seededWorkerLabel ?? "").split(" ");
        return (
          <div className="w-full">
            <WorkerCombobox
              value={typeof editValue === "string" ? editValue : ""}
              businessId={typeof draft.selectedBusinessId === "string" ? draft.selectedBusinessId : undefined}
              onChange={(id, worker) => {
                const label = `${worker?.firstName ?? ""} ${worker?.lastName ?? ""}`.trim();
                if (label) setResolvedRefs((p) => ({ ...p, workerId: label }));
                commitField(key, id);
              }}
              initialWorker={
                seededWorkerLabel && typeof editValue === "string"
                  ? { id: editValue, firstName, lastName: rest.join(" ") }
                  : null
              }
              testId={`edit-input-${key}`}
            />
          </div>
        );
      }
      case "business": {
        return (
          <div className="w-full">
            <BusinessCombobox
              value={typeof editValue === "string" ? editValue : null}
              onChange={(id, b) => {
                if (b?.name) setResolvedRefs((p) => ({ ...p, [key]: b.name }));
                commitField(key, id);
              }}
              testId={`edit-input-${key}`}
            />
          </div>
        );
      }
      case "country": {
        return (
          <Select
            defaultOpen
            defaultValue={typeof editValue === "string" ? editValue : undefined}
            onValueChange={(v) => commitField(key, v)}
            onOpenChange={(o) => {
              if (!o && editingField === key) cancelEdit();
            }}
          >
            <SelectTrigger className="h-8 text-sm" data-testid={`edit-input-${key}`}>
              <SelectValue placeholder="Select country…" />
            </SelectTrigger>
            <SelectContent>
              {countries.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
      case "template": {
        if (!templatesEnabled) {
          return (
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>Set country and employment type first</span>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={cancelEdit}>
                <XIcon className="h-3 w-3" />
              </Button>
            </div>
          );
        }
        return (
          <Select
            defaultOpen
            defaultValue={typeof editValue === "string" ? editValue : undefined}
            onValueChange={(v) => commitField(key, v)}
            onOpenChange={(o) => {
              if (!o && editingField === key) cancelEdit();
            }}
          >
            <SelectTrigger className="h-8 text-sm" data-testid={`edit-input-${key}`}>
              <SelectValue placeholder="Select template…" />
            </SelectTrigger>
            <SelectContent>
              {contractTemplates.length === 0 ? (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">No templates for this combination</div>
              ) : (
                contractTemplates.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        );
      }
      case "roleTitle": {
        return (
          <Select
            defaultOpen
            defaultValue={typeof editValue === "string" ? editValue : undefined}
            onValueChange={(v) => {
              if (v === CUSTOM_ROLE_SENTINEL) {
                // Switch to editing customRoleTitle instead. Null the id (the
                // server upserts a new role row on Create Contract). Deferred
                // via setTimeout so this state update lands AFTER Radix's
                // batched onOpenChange(false) → cancelEdit — otherwise the
                // cancel would clobber the switch.
                setDraft((prev) => ({ ...prev, roleTitleId: null }));
                const nextValue = typeof draft.customRoleTitle === "string" ? draft.customRoleTitle : "";
                setTimeout(() => {
                  setEditingField("customRoleTitle");
                  setEditValue(nextValue);
                }, 0);
                return;
              }
              // Clear customRoleTitle so the picked title wins.
              commitField(key, v, { customRoleTitle: null });
            }}
            onOpenChange={(o) => {
              if (!o && editingField === key) cancelEdit();
            }}
          >
            <SelectTrigger className="h-8 text-sm" data-testid={`edit-input-${key}`}>
              <SelectValue placeholder="Select role title…" />
            </SelectTrigger>
            <SelectContent>
              {roleTitles.map((r: any) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.title}
                </SelectItem>
              ))}
              <SelectItem value={CUSTOM_ROLE_SENTINEL}>Custom (free text)…</SelectItem>
            </SelectContent>
          </Select>
        );
      }
      default:
        return null;
    }
  };

  const isEditable = (key: string) => key in FIELD_EDITOR;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-6xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        data-testid="dialog-ai-contract-chat"
      >
        <DialogHeader className="p-4 border-b border-border bg-gradient-to-r from-primary-50 to-accent-50 dark:from-primary/10 dark:to-accent/10">
          <DialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            Draft a contract with AI
          </DialogTitle>
          <DialogDescription>
            Describe the hire in one or two sentences. I'll fill what I can and ask about anything unclear — click any field on the right to edit it directly.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-5 min-h-0 bg-card">
          {/* Chat pane */}
          <div className="md:col-span-3 flex flex-col min-h-0 border-r border-border">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  {m.role === "assistant" && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] px-3.5 py-2 text-sm whitespace-pre-wrap shadow-sm ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground rounded-2xl rounded-br-sm"
                        : "bg-muted text-foreground rounded-2xl rounded-bl-sm"
                    }`}
                    data-testid={`chat-message-${m.role}-${i}`}
                  >
                    {m.content}
                  </div>
                  {m.role === "user" && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center mt-0.5">
                      <UserIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {sendMutation.isPending && (
                <div className="flex gap-2 justify-start" data-testid="chat-loading">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="rounded-2xl rounded-bl-sm px-3.5 py-2 bg-muted text-muted-foreground text-sm flex items-center gap-2 shadow-sm">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Drafting…
                  </div>
                </div>
              )}

              {pending
                .filter((q) => q.fieldPath === "workerId" && (!q.candidates || q.candidates.length === 0))
                .map((q) => (
                  <div
                    key={q.fieldPath}
                    className="mt-2 p-3 rounded-lg border border-amber-200 bg-amber-50 text-sm dark:border-amber-900/50 dark:bg-amber-950/30"
                    data-testid="pending-worker-email"
                  >
                    <div className="text-xs font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wide mb-1">
                      Worker email needed
                    </div>
                    <div className="text-foreground/90 mb-2">{q.question}</div>
                    <div className="text-xs text-muted-foreground">
                      Reply with the worker's email in the message box below and I'll look them up.
                    </div>
                  </div>
                ))}
            </div>

            {/* Composer */}
            <Popover
              open={mention !== null}
              onOpenChange={(o) => {
                if (!o) setMention(null);
              }}
            >
              <PopoverTrigger asChild>
                <div className="border-t border-border p-3 bg-card">
                  <div className="flex items-end gap-2">
                    <Textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => {
                        const value = e.target.value;
                        setInput(value);
                        detectMention(value, e.target.selectionStart ?? value.length);
                      }}
                      onKeyDown={handleKeyDown}
                      onClick={(e) => {
                        // Re-check mention state when cursor moves via click.
                        detectMention(
                          e.currentTarget.value,
                          e.currentTarget.selectionStart ?? e.currentTarget.value.length,
                        );
                      }}
                      placeholder="Type your message (Enter to send · @worker · #host-client)"
                      rows={2}
                      className="resize-none focus-visible:ring-primary/40 focus-visible:ring-2 focus-visible:ring-offset-0"
                      data-testid="input-ai-chat"
                    />
                    <Button
                      type="button"
                      onClick={handleSend}
                      disabled={!input.trim() || sendMutation.isPending}
                      className="h-10 w-10 p-0 shrink-0"
                      data-testid="button-ai-send"
                    >
                      {sendMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </PopoverTrigger>
              <PopoverContent
                side="top"
                align="start"
                sideOffset={6}
                className="p-0 w-[320px]"
                onOpenAutoFocus={(e) => e.preventDefault()}
                data-testid={`mention-popover-${mention?.type ?? ""}`}
              >
                {mention?.type === "worker" && (
                  <Command shouldFilter={false}>
                    <div className="px-3 py-2 border-b border-border text-xs text-muted-foreground">
                      Pick a worker for @{mention.query || "…"}
                    </div>
                    <CommandList>
                      {workerMentionQuery.isFetching && !workerMentionQuery.data ? (
                        <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" /> Searching…
                        </div>
                      ) : (workerMentionQuery.data?.items?.length ?? 0) === 0 ? (
                        <CommandEmpty>No workers found.</CommandEmpty>
                      ) : (
                        <CommandGroup>
                          {(workerMentionQuery.data?.items ?? []).map((w: any) => (
                            <CommandItem
                              key={w.id}
                              value={w.id}
                              onSelect={() => pickMentionWorker(w)}
                            >
                              <div className="flex flex-col">
                                <span>
                                  {w.firstName} {w.lastName}
                                </span>
                                {w.email && (
                                  <span className="text-xs text-muted-foreground">{w.email}</span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                )}
                {mention?.type === "hostClient" && (() => {
                  const q = mention.query.toLowerCase();
                  const filtered = hostClientList.filter(
                    (c: any) => !q || (c.name ?? "").toLowerCase().includes(q),
                  );
                  const canCreateNew = mention.query.trim().length > 0 && filtered.length === 0;
                  return (
                    <Command shouldFilter={false}>
                      <div className="px-3 py-2 border-b border-border text-xs text-muted-foreground">
                        Pick a host client for #{mention.query || "…"}
                      </div>
                      <CommandList>
                        {filtered.length === 0 && !canCreateNew && (
                          <CommandEmpty>Type a host client name to search or create…</CommandEmpty>
                        )}
                        {filtered.length > 0 && (
                          <CommandGroup>
                            {filtered.slice(0, 8).map((c: any) => (
                              <CommandItem
                                key={c.id}
                                value={c.id}
                                onSelect={() => pickMentionHostClient(c)}
                              >
                                {c.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )}
                        {canCreateNew && (
                          <CommandGroup heading="No match — create new">
                            <CommandItem
                              value={`__create_new__${mention.query}`}
                              onSelect={() => pickMentionCreateNewHostClient(mention.query)}
                              data-testid="mention-create-new-host-client"
                            >
                              <Sparkles className="h-3.5 w-3.5 mr-2 text-primary" />
                              Create new host client "{mention.query}"
                            </CommandItem>
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                  );
                })()}
              </PopoverContent>
            </Popover>
          </div>

          {/* Draft preview pane */}
          <div className="md:col-span-2 flex flex-col min-h-0 bg-muted/30">
            <div className="p-3 border-b border-border bg-card">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Draft preview
              </div>
              <div className="text-xs mt-1">
                {serverGateReady ? (
                  <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Ready to create
                  </span>
                ) : (
                  <div className="space-y-1">
                    <span className="text-muted-foreground">
                      {nextSteps.required.length + nextSteps.conditional.length} field
                      {nextSteps.required.length + nextSteps.conditional.length === 1 ? "" : "s"} still needed
                    </span>
                    {(() => {
                      const missing = [...nextSteps.required, ...nextSteps.conditional];
                      if (missing.length === 0) return null;
                      return (
                        <div className="flex flex-wrap gap-1" data-testid="missing-fields-chips">
                          {missing.map((k) => {
                            const targetStep =
                              (STEP_DEFS.find((s) => s.fields.includes(k))?.step ?? activeStep) as StepNumber;
                            return (
                              <button
                                key={k}
                                type="button"
                                onClick={() => {
                                  setActiveStep(targetStep);
                                  setManuallyNavigated(true);
                                  if (isEditable(k)) {
                                    requestAnimationFrame(() => beginEdit(k));
                                  }
                                }}
                                className="text-[10px] px-1.5 py-0.5 rounded border border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200 hover:bg-amber-100 transition-colors"
                                title={`Step ${targetStep} — click to jump and edit`}
                                data-testid={`missing-chip-${k}`}
                              >
                                {labelOf(k)}
                                <span className="ml-1 opacity-60">· Step {targetStep}</span>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {/* Stepper: 4 pills at the top of the preview pane. */}
              <div className="flex items-center gap-1 pb-1" data-testid="stepper">
                {STEP_DEFS.map((s) => {
                  const skipped = stepIsSkipped(s.step, draft);
                  const complete = isStepComplete(s.step, draft, nextSteps, activeRole);
                  const isActive = activeStep === s.step;
                  return (
                    <button
                      key={s.step}
                      type="button"
                      onClick={() => {
                        setActiveStep(s.step);
                        setManuallyNavigated(true);
                      }}
                      className={`flex-1 min-w-0 flex items-center gap-1.5 px-2 py-1.5 rounded-md border text-xs transition-colors cursor-pointer ${
                        isActive
                          ? "border-primary/50 bg-primary/10 text-foreground"
                          : complete
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300 hover:bg-emerald-100/70"
                          : "border-border bg-muted/40 text-muted-foreground hover:bg-muted/60"
                      }`}
                      data-testid={`step-pill-${s.step}`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 ${
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : complete
                            ? "bg-emerald-500 text-white"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {complete ? <CheckIcon className="h-3 w-3" /> : s.step}
                      </span>
                      <span className="truncate font-medium">
                        {s.title}
                        {skipped && (
                          <span className="ml-1 text-[9px] font-normal opacity-70">(n/a)</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>

              {(() => {
                const stepFields = new Set(
                  STEP_DEFS.find((s) => s.step === activeStep)?.fields ?? [],
                );
                const stepOptional = nextSteps.optionalRecommended.filter((k) => stepFields.has(k));
                return (
                  <>
              {stepOptional.length > 0 && (
                <details className="text-sm" open={serverGateReady}>
                  <summary className="cursor-pointer text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Optional on this step ({stepOptional.length})
                  </summary>
                  <ul className="mt-1 space-y-0.5">
                    {stepOptional.map((k) => {
                      const isEditing = editingField === k;
                      return (
                        <li key={k}>
                          {isEditing ? (
                            <div className="pl-3.5 py-1">
                              <div className="text-xs text-muted-foreground mb-1">{labelOf(k)}</div>
                              {renderEditor(k)}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => isEditable(k) && beginEdit(k)}
                              disabled={!isEditable(k)}
                              className={`w-full text-left rounded px-1.5 py-0.5 flex items-center gap-2 transition-colors ${
                                isEditable(k) ? "hover:bg-muted cursor-pointer" : ""
                              }`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 flex-shrink-0" />
                              <span className="flex-1 text-muted-foreground">{labelOf(k)}</span>
                              {isEditable(k) && <Pencil className="h-3 w-3 text-muted-foreground opacity-50" />}
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </details>
              )}

              {STEP_DEFS.map((section) => {
                if (stepIsSkipped(section.step, draft)) return null;
                const isCurrent = section.step === activeStep;
                const isPast = section.step < activeStep;
                // Future step that isn't active: no extra render below the
                // pill row. When the user clicks a future pill, activeStep
                // becomes that step → isCurrent=true → full body renders.
                if (!isCurrent && !isPast) return null;

                const filledKeys = section.fields.filter((k) => {
                  if (k === "remunerationLines") {
                    return Array.isArray(draft[k]) && draft[k].length > 0;
                  }
                  return hasValue(draft[k]);
                });
                const needsHostClientBanner =
                  section.step === 2 &&
                  draft.isForClient === true &&
                  !hasValue(draft.customerBusinessId) &&
                  hasValue(draft.clientName);

                // Past step: compact summary that jumps back on click.
                if (isPast) {
                  if (filledKeys.length === 0) return null;
                  const summary = filledKeys
                    .slice(0, 3)
                    .map((k) => resolveLabel(k, draft[k]))
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <button
                      key={section.step}
                      type="button"
                      onClick={() => {
                        setActiveStep(section.step);
                        setManuallyNavigated(true);
                      }}
                      className="w-full text-left rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20 px-2.5 py-1.5 text-xs flex items-center gap-2 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/30 transition-colors"
                      data-testid={`past-step-${section.step}`}
                    >
                      <span className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                        <CheckIcon className="h-2.5 w-2.5 text-white" />
                      </span>
                      <span className="font-semibold text-emerald-900 dark:text-emerald-200 shrink-0">
                        Step {section.step} · {section.title}
                      </span>
                      <span className="truncate text-emerald-800/80 dark:text-emerald-300/80">
                        {summary}
                      </span>
                    </button>
                  );
                }

                // Current step — full render.
                return (
                  <div key={section.step}>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                      Step {section.step} · {section.title}
                    </div>
                    {needsHostClientBanner && (() => {
                      const missing: string[] = [];
                      if (!hasValue(draft.clientContactEmail)) missing.push("contact email");
                      if (!hasValue(draft.clientAddress)) missing.push("address");
                      const ready = missing.length === 0;
                      return (
                        <div
                          className={`mb-2 p-2.5 rounded-lg border text-xs ${
                            ready
                              ? "border-primary/30 bg-primary/5"
                              : "border-amber-300 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30"
                          }`}
                          data-testid="banner-will-create-host-client"
                        >
                          <div className="flex items-center gap-1.5 mb-0.5 text-foreground">
                            <Sparkles
                              className={`h-3 w-3 ${
                                ready ? "text-primary" : "text-amber-600 dark:text-amber-400"
                              }`}
                            />
                            <span className="font-semibold">
                              {ready
                                ? "New host client will be created"
                                : "New host client — details still needed"}
                            </span>
                          </div>
                          {ready ? (
                            <div className="text-muted-foreground">
                              "{draft.clientName}" will be added on Create Contract. A login will be
                              created for{" "}
                              <span className="font-medium text-foreground">
                                {draft.clientContactEmail}
                              </span>{" "}
                              and temp credentials emailed there.
                            </div>
                          ) : (
                            <div className="text-muted-foreground">
                              To create "{draft.clientName}" as a host client, provide the{" "}
                              {missing.join(" and ")}. The contact email becomes the client's login
                              username; credentials are auto-emailed.
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    <div className="space-y-0.5">
                      {section.displayFields(draft, activeRole).map((key) => {
                        const filled =
                          key === "remunerationLines"
                            ? Array.isArray(draft[key]) && draft[key].length > 0
                            : hasValue(draft[key]);

                        if (key === "remunerationLines" && filled) {
                          const lines: any[] = draft[key] || [];
                          return (
                            <div key={key} className="text-sm py-1 px-1.5">
                              <div className="text-muted-foreground text-xs mb-1">{labelOf(key)}</div>
                              <ul className="ml-3 text-foreground text-xs space-y-0.5">
                                {lines.map((l, i) => (
                                  <li key={i}>
                                    {l.description ?? l.type ?? "Line"}: {l.amount ?? "?"} {draft.currency ?? ""} /{" "}
                                    {l.frequency ?? "?"}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          );
                        }

                        const isEditing = editingField === key;
                        if (isEditing) {
                          return (
                            <div
                              key={key}
                              className="rounded-lg bg-card border border-primary/30 shadow-sm px-2 py-2"
                              data-testid={`edit-row-${key}`}
                            >
                              <div className="text-xs text-muted-foreground mb-1">{labelOf(key)}</div>
                              {renderEditor(key)}
                            </div>
                          );
                        }
                        return (
                          <div
                            key={key}
                            role="button"
                            tabIndex={isEditable(key) ? 0 : -1}
                            onClick={() => isEditable(key) && beginEdit(key)}
                            onKeyDown={(e) => {
                              if (!isEditable(key)) return;
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                beginEdit(key);
                              }
                            }}
                            className={`group flex items-baseline justify-between gap-2 text-sm rounded px-1.5 py-1 transition-colors ${
                              isEditable(key) ? "hover:bg-card cursor-pointer" : ""
                            }`}
                            data-testid={`row-${key}`}
                          >
                            <div className="text-muted-foreground flex-shrink-0">{labelOf(key)}</div>
                            <div className="flex items-center gap-1.5 justify-end min-w-0 flex-1">
                              {filled ? (
                                <span
                                  className="text-foreground text-right truncate"
                                  title={resolveLabel(key, draft[key])}
                                >
                                  {resolveLabel(key, draft[key])}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/60 italic text-right truncate">
                                  Not set
                                </span>
                              )}
                              {filled && aiFilledFields.has(key) && (
                                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold shrink-0">
                                  AI
                                </span>
                              )}
                              {isEditable(key) && (
                                <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
                  </>
                );
              })()}
            </div>
            <div className="border-t border-border p-3 flex items-center justify-between gap-2 bg-card">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                data-testid="button-ai-discard"
              >
                Discard
              </Button>
              <Button
                type="button"
                onClick={() => createContractMutation.mutate()}
                disabled={!canCreate}
                data-testid="button-ai-create-contract"
              >
                {createContractMutation.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Creating…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Create Contract
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
