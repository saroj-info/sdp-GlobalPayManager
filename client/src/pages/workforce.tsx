import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState, useMemo } from "react";
import { AddWorkerModal } from "@/components/modals/add-worker-modal";
import { ViewWorkerModal } from "@/components/modals/view-worker-modal";
import { useLocation } from "wouter";
import { usePageHeader, useAuthenticatedLayout } from "@/contexts/AuthenticatedLayoutContext";
import { LayoutGrid, List, ArrowUpDown, Building2 } from "lucide-react";

export default function Workforce() {
  const [, setLocation] = useLocation();
  const [showAddWorker, setShowAddWorker] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCountry, setFilterCountry] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterBusiness, setFilterBusiness] = useState("all");
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [sortBy, setSortBy] = useState<'name' | 'country' | 'type' | 'client'>('name');
  
  usePageHeader("Workforce", "Manage your employees and contractors");
  const { countries } = useAuthenticatedLayout();

  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  const { data: businesses = [] } = useQuery({
    queryKey: ["/api/businesses"],
    enabled: (user as any)?.userType === 'sdp_internal',
  });

  const { data: workers = [] } = useQuery({
    queryKey: filterBusiness && filterBusiness !== "all" ? ["/api/workers/business", filterBusiness] : ["/api/workers"],
  });

  // Fetch workers provided TO this business by other businesses (host client scenario)
  const { data: providedWorkers = [] } = useQuery<any[]>({
    queryKey: ["/api/workers/provided"],
    enabled: (user as any)?.userType === 'business_user',
  });

  const isBusiness = (user as any)?.userType === 'business_user';
  const hasProvidedWorkers = isBusiness && (providedWorkers as any[]).length > 0;

  // Group provided workers by their providing business
  const providedWorkersByBusiness = useMemo(() => {
    const groups = new Map<string, { businessName: string; workers: any[] }>();
    for (const w of providedWorkers as any[]) {
      const key = w.providedByBusinessId;
      if (!groups.has(key)) {
        groups.set(key, { businessName: w.providedByBusinessName, workers: [] });
      }
      groups.get(key)!.workers.push(w);
    }
    return Array.from(groups.values());
  }, [providedWorkers]);

  const accessibleCountries = countries || [];

  const filteredAndSortedWorkers = useMemo(() => {
    // Filter workers
    const filtered = (workers as any[]).filter((worker: any) => {
      const matchesSearch = searchTerm === "" || 
        `${worker.firstName} ${worker.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        worker.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCountry = filterCountry === "all" || filterCountry === "" || worker.countryId === filterCountry;
      const matchesType = filterType === "all" || filterType === "" || worker.workerType === filterType;
      
      return matchesSearch && matchesCountry && matchesType;
    });
    
    // Sort workers
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
        case 'country':
          return a.country.name.localeCompare(b.country.name);
        case 'type':
          return a.workerType.localeCompare(b.workerType);
        case 'client':
          const aBusinessName = (businesses as any[]).find(business => business.id === a.businessId)?.name || '';
          const bBusinessName = (businesses as any[]).find(business => business.id === b.businessId)?.name || '';
          return aBusinessName.localeCompare(bBusinessName);
        default:
          return 0;
      }
    });
    
    return sorted;
  }, [workers, searchTerm, filterCountry, filterType, sortBy, businesses]);

  return (
    <div className="p-6">
          {/* Filters and Actions */}
          <div className="flex flex-col gap-4 mb-6">
            {/* Top Row: Search, Filters, and Actions */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search workers by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                  data-testid="input-search-workers"
                />
              </div>
              <Select value={filterCountry} onValueChange={setFilterCountry}>
                <SelectTrigger className="w-48" data-testid="select-filter-country">
                  <SelectValue placeholder="Filter by country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {accessibleCountries.map((country: any) => (
                    <SelectItem key={country.id} value={country.id}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-48" data-testid="select-filter-type">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="employee">Employees</SelectItem>
                  <SelectItem value="contractor">Contractors</SelectItem>
                </SelectContent>
              </Select>
              {(user as any)?.userType === 'sdp_internal' && (
                <Select value={filterBusiness} onValueChange={setFilterBusiness}>
                  <SelectTrigger className="w-48" data-testid="select-filter-client">
                    <SelectValue placeholder="Filter by client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    {(businesses as any[]).map((business: any) => (
                      <SelectItem key={business.id} value={business.id}>
                        {business.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button onClick={() => setShowAddWorker(true)} data-testid="button-add-worker">
                <i className="fas fa-plus mr-2"></i>
                Add Worker
              </Button>
            </div>

            {/* Bottom Row: View Toggle and Sort */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-secondary-600 mr-2">View:</span>
                <div className="flex border border-secondary-300 rounded-md overflow-hidden">
                  <Button
                    variant={viewMode === 'card' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('card')}
                    className="rounded-none border-r border-secondary-300"
                    data-testid="button-view-card"
                  >
                    <LayoutGrid className="h-4 w-4 mr-1" />
                    Card
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="rounded-none"
                    data-testid="button-view-list"
                  >
                    <List className="h-4 w-4 mr-1" />
                    List
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-secondary-600" />
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="w-40" data-testid="select-sort-by">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="country">Country</SelectItem>
                    <SelectItem value="type">Type</SelectItem>
                    {viewMode === 'list' && (user as any)?.userType === 'sdp_internal' && (
                      <SelectItem value="client">Client</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Workers Display - Card or List View */}
          {viewMode === 'card' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedWorkers.length > 0 ? (
                filteredAndSortedWorkers.map((worker: any) => (
                  <Card key={worker.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                          <span className="text-primary-700 font-medium">
                            {worker.firstName[0]}{worker.lastName[0]}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <CardTitle className="text-lg">
                              {worker.firstName} {worker.lastName}
                            </CardTitle>
                            <Badge variant={worker.workerType === 'employee' ? 'default' : 'secondary'} className="capitalize flex-shrink-0">
                              {worker.workerType === 'third_party_worker' ? 'Third Party' : worker.workerType}
                            </Badge>
                          </div>
                          <p className="text-sm text-secondary-600 truncate">{worker.email}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <i className="fas fa-flag text-primary-500 mr-2"></i>
                          <span className="text-sm font-medium">{worker.country.name}</span>
                        </div>
                        <div className="flex items-center">
                          <i className={`fas ${
                            worker.onboardingCompleted ? 'fa-user-check text-green-600' :
                            worker.userId ? 'fa-user-clock text-blue-500' :
                            worker.invitationSent ? 'fa-envelope text-yellow-500' :
                            'fa-clock text-gray-400'
                          } mr-2`}></i>
                          <span className="text-sm">
                            {worker.onboardingCompleted ? 'Active' :
                             worker.userId ? 'Accepted' :
                             worker.invitationSent ? 'Invited' : 'Pending'}
                          </span>
                        </div>
                      </div>
                      <div className="mt-4 flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => setSelectedWorker(worker)}
                          data-testid={`button-view-details-${worker.id}`}
                        >
                          View Details
                        </Button>
                        <Button 
                          size="sm" 
                          className="flex-1"
                          onClick={() => setLocation(`/contracts?workerId=${worker.id}`)}
                          data-testid={`button-create-contract-${worker.id}`}
                        >
                          Create Contract
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-full">
                  <Card>
                    <CardContent className="text-center py-12">
                      <i className="fas fa-users text-secondary-300 text-6xl mb-4"></i>
                      <h3 className="text-lg font-medium text-secondary-900 mb-2">
                        {searchTerm || filterCountry || filterType ? 'No workers found' : 'No workers yet'}
                      </h3>
                      <p className="text-secondary-600 mb-6">
                        {searchTerm || filterCountry || filterType 
                          ? 'Try adjusting your search or filters'
                          : 'Get started by adding your first worker'
                        }
                      </p>
                      {!searchTerm && !filterCountry && !filterType && (
                        <Button onClick={() => setShowAddWorker(true)}>
                          <i className="fas fa-plus mr-2"></i>
                          Add Your First Worker
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          ) : (
            /* List View */
            <div className="bg-white rounded-lg shadow">
              {filteredAndSortedWorkers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Type</TableHead>
                      {(user as any)?.userType === 'sdp_internal' && <TableHead>Client</TableHead>}
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedWorkers.map((worker: any) => (
                      <TableRow key={worker.id} className="hover:bg-secondary-50">
                        <TableCell>
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                              <span className="text-primary-700 text-xs font-medium">
                                {worker.firstName[0]}{worker.lastName[0]}
                              </span>
                            </div>
                            <span className="font-medium">{worker.firstName} {worker.lastName}</span>
                          </div>
                        </TableCell>
                        <TableCell>{worker.email}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <i className="fas fa-flag text-primary-500 mr-2 text-xs"></i>
                            {worker.country.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={worker.workerType === 'employee' ? 'default' : 'secondary'} className="capitalize">
                            {worker.workerType === 'third_party_worker' ? 'Third Party' : worker.workerType}
                          </Badge>
                        </TableCell>
                        {(user as any)?.userType === 'sdp_internal' && (
                          <TableCell>
                            {(businesses as any[]).find(b => b.id === worker.businessId)?.name || '-'}
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex items-center">
                            <i className={`fas ${
                              worker.onboardingCompleted ? 'fa-user-check text-green-600' :
                              worker.userId ? 'fa-user-clock text-blue-500' :
                              worker.invitationSent ? 'fa-envelope text-yellow-500' :
                              'fa-clock text-gray-400'
                            } mr-2`}></i>
                            <span className="text-sm">
                              {worker.onboardingCompleted ? 'Active' :
                               worker.userId ? 'Accepted' :
                               worker.invitationSent ? 'Invited' : 'Pending'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedWorker(worker)}
                              data-testid={`button-view-details-list-${worker.id}`}
                            >
                              View
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => setLocation(`/contracts?workerId=${worker.id}`)}
                              data-testid={`button-create-contract-list-${worker.id}`}
                            >
                              Contract
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <i className="fas fa-users text-secondary-300 text-6xl mb-4"></i>
                  <h3 className="text-lg font-medium text-secondary-900 mb-2">
                    {searchTerm || filterCountry || filterType ? 'No workers found' : 'No workers yet'}
                  </h3>
                  <p className="text-secondary-600 mb-6">
                    {searchTerm || filterCountry || filterType 
                      ? 'Try adjusting your search or filters'
                      : 'Get started by adding your first worker'
                    }
                  </p>
                  {!searchTerm && !filterCountry && !filterType && (
                    <Button onClick={() => setShowAddWorker(true)}>
                      <i className="fas fa-plus mr-2"></i>
                      Add Your First Worker
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Provided Workers Section — shown only for businesses that are host clients */}
          {hasProvidedWorkers && (
            <div className="mt-8">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-secondary-900">Workers Provided to You</h2>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  {(providedWorkers as any[]).length} worker{(providedWorkers as any[]).length !== 1 ? 's' : ''}
                </Badge>
              </div>
              <p className="text-sm text-secondary-600 mb-4">
                These workers have been placed with your organisation by a business partner. They are managed by their employing business — you can view their details and approve their timesheets.
              </p>

              {providedWorkersByBusiness.map((group) => (
                <div key={group.businessName} className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-medium text-secondary-700">Provided by</span>
                    <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-100">
                      {group.businessName}
                    </Badge>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow className="bg-blue-50">
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Country</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Contract Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.workers.map((worker: any) => (
                        <TableRow key={worker.id} className="hover:bg-blue-50/50">
                          <TableCell>
                            <div className="font-medium text-secondary-900">
                              {worker.firstName} {worker.lastName}
                            </div>
                          </TableCell>
                          <TableCell className="text-secondary-600">{worker.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{worker.contractCountry || worker.country?.name || '—'}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs capitalize">
                              {worker.workerType?.replace('_', ' ') || '—'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`text-xs ${
                                worker.contractStatus === 'active' ? 'bg-green-100 text-green-800' :
                                worker.contractStatus === 'pending_sdp_review' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-secondary-100 text-secondary-700'
                              }`}
                            >
                              {worker.contractStatus?.replace(/_/g, ' ') || '—'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          )}

          <AddWorkerModal 
            open={showAddWorker} 
            onOpenChange={setShowAddWorker}
            countries={accessibleCountries}
          />
          
          <ViewWorkerModal 
            open={!!selectedWorker}
            onOpenChange={(open) => !open && setSelectedWorker(null)}
            worker={selectedWorker}
            currentUserType={(user as any)?.userType}
          />
        </div>
  );
}
