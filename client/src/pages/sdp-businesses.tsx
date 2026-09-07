import { useMemo, useState, useEffect } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePageHeader, useAuthenticatedLayout } from "@/contexts/AuthenticatedLayoutContext";
import { ArrowLeft, Building2, Mail, Search, Users } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { ViewWorkerModal } from "@/components/modals/view-worker-modal";
import { DataPagination } from "@/components/ui/data-pagination";
import { PageLoader } from "@/components/ui/loader";

const PAGE_SIZE = 20;

interface BusinessRow {
  id: string;
  name: string;
  isRegistered: boolean;
  isSdpOwned: boolean;
  accessibleCountries?: string[] | null;
  contactEmail?: string | null;
  contactName?: string | null;
  parentBusinessId?: string | null;
  address?: string | null;
  createdAt?: string | null;
}

function BusinessTag({ b }: { b: BusinessRow }) {
  if (b.isSdpOwned) {
    return (
      <Badge variant="outline" className="border-indigo-300 text-indigo-700 bg-indigo-50">
        SDP-owned
      </Badge>
    );
  }
  if (b.isRegistered === false) {
    return (
      <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50">
        Host client
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50">
      Registered business
    </Badge>
  );
}

export default function SdpBusinessesPage() {
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCountry, setFilterCountry] = useState("all");
  const [workerPage, setWorkerPage] = useState(1);

  usePageHeader("Businesses", "Browse workers by business");

  const { countries } = useAuthenticatedLayout();

  const { data: currentUser } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  const sdpRole = (currentUser as any)?.sdpRole;
  const isAllowed = !!sdpRole && ['sdp_super_admin', 'sdp_admin', 'sdp_agent'].includes(sdpRole);

  // Fetch all businesses INCLUDING the SDP-owned "employer of record" row so
  // the admin can drill into it too. The escape hatch was added in the
  // previous round exactly for admin surfaces like this.
  const { data: businesses = [], isLoading: businessesLoading } = useQuery<BusinessRow[]>({
    queryKey: ["/api/businesses", { includeSdp: true }],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/businesses?includeSdp=true");
      return res.json();
    },
    enabled: isAllowed,
  });

  const selectedBusiness = useMemo(
    () => businesses.find((b) => b.id === selectedBusinessId) ?? null,
    [businesses, selectedBusinessId],
  );

  const countryNameById = useMemo(
    () => new Map<string, string>((countries ?? []).map((c: any) => [c.id, c.name])),
    [countries],
  );

  const businessById = useMemo(
    () => new Map(businesses.map((b) => [b.id, b])),
    [businesses],
  );

  // Host clients of the currently selected business — already present in the
  // same /api/businesses payload (rows with isRegistered=false), no extra query.
  const hostClientsOfSelected = useMemo(
    () => selectedBusinessId
      ? businesses.filter((b) => b.isRegistered === false && b.parentBusinessId === selectedBusinessId)
      : [],
    [businesses, selectedBusinessId],
  );

  // Reset pagination whenever the selected business changes.
  useEffect(() => {
    setWorkerPage(1);
  }, [selectedBusinessId]);

  // Workers for the selected business — server-paginated via the same modular
  // endpoint the workforce page uses. Returns rows enriched with `country`,
  // `business` and `isSharedFromSdp`.
  const workerListParams = useMemo(() => ({
    page: workerPage,
    pageSize: PAGE_SIZE,
    businessId: selectedBusinessId ?? undefined,
    sortBy: "name",
  }), [workerPage, selectedBusinessId]);

  const { data: workerListData, isLoading: workersLoading } = useQuery<{
    items: any[]; total: number; page: number; pageSize: number;
  }>({
    queryKey: ["/api/workers/list", workerListParams],
    queryFn: async () => {
      const qs = new URLSearchParams();
      qs.set("page", String(workerListParams.page));
      qs.set("pageSize", String(workerListParams.pageSize));
      qs.set("sortBy", workerListParams.sortBy);
      if (workerListParams.businessId) qs.set("businessId", workerListParams.businessId);
      return (await apiRequest("GET", `/api/workers/list?${qs.toString()}`)).json();
    },
    enabled: !!selectedBusinessId,
    placeholderData: keepPreviousData,
  });

  const workers = workerListData?.items ?? [];
  const totalWorkers = workerListData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalWorkers / PAGE_SIZE));

  // Lightweight stats for the details card — count-only pages (pageSize=1)
  // against the modular list endpoints, fetched only while a business is open.
  const { data: contractStats } = useQuery<{ total: number }>({
    queryKey: ["/api/contracts/list", { businessId: selectedBusinessId, pageSize: 1 }],
    queryFn: async () =>
      (await apiRequest("GET", `/api/contracts/list?page=1&pageSize=1&businessId=${selectedBusinessId}`)).json(),
    enabled: !!selectedBusinessId,
  });

  const { data: activeContractStats } = useQuery<{ total: number }>({
    queryKey: ["/api/contracts/list", { businessId: selectedBusinessId, status: "active", pageSize: 1 }],
    queryFn: async () =>
      (await apiRequest("GET", `/api/contracts/list?page=1&pageSize=1&status=active&businessId=${selectedBusinessId}`)).json(),
    enabled: !!selectedBusinessId,
  });

  const { data: timesheetStats } = useQuery<{
    total: number;
    statusCounts?: { all: number; draft: number; submitted: number; approved: number; rejected: number };
  }>({
    queryKey: ["/api/timesheets/list", { businessId: selectedBusinessId, pageSize: 1 }],
    queryFn: async () =>
      (await apiRequest("GET", `/api/timesheets/list?page=1&pageSize=1&businessId=${selectedBusinessId}`)).json(),
    enabled: !!selectedBusinessId,
  });

  const filteredBusinesses = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    // A row matches the country filter on its own accessibleCountries; host
    // clients are created with an empty array, so they fall back to their
    // parent business's countries instead of vanishing under any filter.
    const matchesCountry = (b: BusinessRow): boolean => {
      if (filterCountry === "all") return true;
      if (b.accessibleCountries?.includes(filterCountry)) return true;
      if (b.isRegistered === false && b.parentBusinessId) {
        const parent = businessById.get(b.parentBusinessId);
        return !!parent?.accessibleCountries?.includes(filterCountry);
      }
      return false;
    };
    return businesses.filter((b) =>
      matchesCountry(b)
      && (!q
        || b.name.toLowerCase().includes(q)
        || (b.contactEmail ?? "").toLowerCase().includes(q)),
    );
  }, [businesses, searchTerm, filterCountry, businessById]);

  if (!isAllowed) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-gray-600">You need SDP admin permissions to view businesses.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Detail view: worker list for the selected business
  if (selectedBusinessId && selectedBusiness) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSelectedBusinessId(null)}
            data-testid="button-back-to-businesses"
            className="gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            All businesses
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary-50 text-primary-600 flex-shrink-0">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <CardTitle className="text-xl">{selectedBusiness.name}</CardTitle>
                  <BusinessTag b={selectedBusiness} />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {selectedBusiness.contactName && (
                <div>
                  <span className="text-secondary-500">Contact name: </span>
                  <span className="text-secondary-900">{selectedBusiness.contactName}</span>
                </div>
              )}
              {selectedBusiness.contactEmail && (
                <div>
                  <span className="text-secondary-500">Email: </span>
                  <span className="text-secondary-900">{selectedBusiness.contactEmail}</span>
                </div>
              )}
              {selectedBusiness.address && (
                <div>
                  <span className="text-secondary-500">Address: </span>
                  <span className="text-secondary-900">{selectedBusiness.address}</span>
                </div>
              )}
              <div>
                <span className="text-secondary-500">Workers: </span>
                <span className="text-secondary-900">{totalWorkers}</span>
              </div>
              {selectedBusiness.isRegistered !== false && (
                <div>
                  <span className="text-secondary-500">Host clients: </span>
                  <span className="text-secondary-900">{hostClientsOfSelected.length}</span>
                </div>
              )}
              <div>
                <span className="text-secondary-500">Contracts: </span>
                <span className="text-secondary-900">
                  {contractStats ? contractStats.total : '…'}
                  {activeContractStats ? ` (${activeContractStats.total} active)` : ''}
                </span>
              </div>
              <div>
                <span className="text-secondary-500">Timesheets: </span>
                <span className="text-secondary-900">
                  {timesheetStats ? timesheetStats.total : '…'}
                  {timesheetStats?.statusCounts && timesheetStats.statusCounts.submitted > 0
                    ? ` (${timesheetStats.statusCounts.submitted} awaiting approval)`
                    : ''}
                </span>
              </div>
              {selectedBusiness.createdAt && (
                <div>
                  <span className="text-secondary-500">Created: </span>
                  <span className="text-secondary-900">
                    {new Date(selectedBusiness.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric', month: 'short', day: 'numeric',
                    })}
                  </span>
                </div>
              )}
              {Array.isArray(selectedBusiness.accessibleCountries) && selectedBusiness.accessibleCountries.length > 0 && (
                <div className="sm:col-span-2">
                  <span className="text-secondary-500">Countries: </span>
                  <span className="text-secondary-900">
                    {selectedBusiness.accessibleCountries.map((id) => countryNameById.get(id) ?? id).join(', ')}
                  </span>
                </div>
              )}
              {selectedBusiness.isRegistered === false && selectedBusiness.parentBusinessId
                && businessById.get(selectedBusiness.parentBusinessId) && (
                <div className="sm:col-span-2">
                  <span className="text-secondary-500">Belongs to: </span>
                  <button
                    type="button"
                    onClick={() => setSelectedBusinessId(selectedBusiness.parentBusinessId!)}
                    className="text-primary-600 hover:underline font-medium"
                    data-testid="link-parent-business"
                  >
                    {businessById.get(selectedBusiness.parentBusinessId)!.name}
                  </button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {selectedBusiness.isRegistered !== false && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Host Clients ({hostClientsOfSelected.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {hostClientsOfSelected.length === 0 ? (
                <p className="text-sm text-secondary-500">No host clients for this business.</p>
              ) : (
                <div className="divide-y divide-secondary-100">
                  {hostClientsOfSelected.map((hc) => (
                    <button
                      key={hc.id}
                      type="button"
                      onClick={() => setSelectedBusinessId(hc.id)}
                      className="w-full text-left py-2.5 px-2 -mx-2 rounded-md hover:bg-secondary-50 transition-colors flex items-center gap-3"
                      data-testid={`row-host-client-${hc.id}`}
                    >
                      <div className="flex items-center justify-center h-8 w-8 rounded-md bg-amber-50 text-amber-600 flex-shrink-0">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-secondary-900 truncate">{hc.name}</div>
                        {(hc.contactName || hc.contactEmail) && (
                          <div className="text-xs text-secondary-500 truncate">
                            {[hc.contactName, hc.contactEmail].filter(Boolean).join(' · ')}
                          </div>
                        )}
                      </div>
                      <BusinessTag b={hc} />
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <h3 className="text-sm font-semibold text-secondary-700">Workers</h3>

        {workersLoading && !workerListData ? (
          <PageLoader label="Loading workers" />
        ) : workers.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="mx-auto h-10 w-10 text-secondary-300 mb-3" />
              <p className="text-secondary-600">No workers for this business yet.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workers.map((worker: any) => (
                    <TableRow
                      key={worker.id}
                      className="hover:bg-secondary-50 cursor-pointer"
                      onClick={() => setSelectedWorker(worker)}
                      data-testid={`row-worker-${worker.id}`}
                    >
                      <TableCell>
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                            <span className="text-primary-700 text-xs font-medium">
                              {(worker.firstName?.[0] ?? '') + (worker.lastName?.[0] ?? '')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-medium truncate">
                              {worker.firstName} {worker.lastName}
                            </span>
                            {worker.isSharedFromSdp && (
                              <Badge
                                variant="outline"
                                className="border-blue-300 text-blue-700 flex-shrink-0"
                                title="Employed by SDP; shared into this business."
                              >
                                SDP-employed
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{worker.email}</TableCell>
                      <TableCell>{worker.country?.name ?? '-'}</TableCell>
                      <TableCell>
                        <Badge variant={worker.workerType === 'employee' ? 'default' : 'secondary'} className="capitalize">
                          {worker.workerType === 'third_party_worker' ? 'Third Party' : worker.workerType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {worker.onboardingCompleted ? 'Active' :
                           worker.userId ? 'Accepted' :
                           worker.invitationSent ? 'Invited' : 'Pending'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <DataPagination
              page={workerPage}
              totalPages={totalPages}
              totalItems={totalWorkers}
              pageSize={PAGE_SIZE}
              onPageChange={setWorkerPage}
              label="workers"
            />
          </>
        )}

        <ViewWorkerModal
          open={!!selectedWorker}
          onOpenChange={(open) => { if (!open) setSelectedWorker(null); }}
          worker={selectedWorker
            ? (workers.find((w: any) => w.id === selectedWorker.id) ?? selectedWorker)
            : null}
          currentUserType={(currentUser as any)?.userType}
        />
      </div>
    );
  }

  // Grid view: all businesses
  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search businesses…"
            className="pl-9"
            data-testid="input-search-businesses"
          />
        </div>
        <Select value={filterCountry} onValueChange={setFilterCountry}>
          <SelectTrigger className="w-48" data-testid="select-filter-country">
            <SelectValue placeholder="Filter by country" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Countries</SelectItem>
            {(countries ?? []).map((country: any) => (
              <SelectItem key={country.id} value={country.id}>
                {country.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {businessesLoading ? (
        <PageLoader label="Loading businesses" />
      ) : filteredBusinesses.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Building2 className="mx-auto h-10 w-10 text-secondary-300 mb-3" />
            <p className="text-secondary-600">
              {searchTerm || filterCountry !== 'all' ? 'No businesses match your filters.' : 'No businesses to display.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBusinesses.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setSelectedBusinessId(b.id)}
              className="text-left rounded-xl border border-secondary-200 bg-white shadow-sm hover:shadow-md hover:border-primary-300 transition-all p-4 focus:outline-none focus:ring-2 focus:ring-primary-400"
              data-testid={`card-business-${b.id}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary-50 text-primary-600 flex-shrink-0">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-secondary-900 truncate">{b.name}</div>
                  <div className="mt-1">
                    <BusinessTag b={b} />
                  </div>
                </div>
              </div>
              <div className="mt-3 text-sm text-secondary-600 space-y-1">
                {b.contactEmail ? (
                  <div className="flex items-center gap-1.5 truncate">
                    <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{b.contactEmail}</span>
                  </div>
                ) : (
                  <div className="text-xs italic text-secondary-400">No contact on file</div>
                )}
                {Array.isArray(b.accessibleCountries) && b.accessibleCountries.length > 0 && (
                  <div className="text-xs text-secondary-500">
                    {b.accessibleCountries.length} {b.accessibleCountries.length === 1 ? 'country' : 'countries'}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
