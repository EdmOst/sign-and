import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Search, Filter, Download, Eye, Calendar, Activity } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ActivityLog {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  action_type: string;
  action_description: string;
  metadata: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

interface UserActivityLogsProps {
  onClose: () => void;
}

export const UserActivityLogs: React.FC<UserActivityLogsProps> = ({ onClose }) => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [users, setUsers] = useState<{ email: string; name: string }[]>([]);

  useEffect(() => {
    fetchActivityLogs();
    fetchUsers();
  }, []);

  const fetchActivityLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('user_activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      toast.error('Failed to fetch activity logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('email, display_name')
        .order('email');

      if (error) throw error;
      
      const uniqueUsers = data?.map(user => ({
        email: user.email || '',
        name: user.display_name || user.email || ''
      })) || [];
      
      setUsers(uniqueUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const getActionBadgeColor = (actionType: string) => {
    switch (actionType.toLowerCase()) {
      case 'login':
        return 'bg-green-100 text-green-800';
      case 'logout':
        return 'bg-gray-100 text-gray-800';
      case 'document_upload':
        return 'bg-blue-100 text-blue-800';
      case 'document_sign':
        return 'bg-purple-100 text-purple-800';
      case 'document_download':
        return 'bg-orange-100 text-orange-800';
      case 'document_preview':
        return 'bg-yellow-100 text-yellow-800';
      case 'user_role_change':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action_description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesActionFilter = actionFilter === "all" || log.action_type === actionFilter;
    const matchesUserFilter = userFilter === "all" || log.user_email === userFilter;
    
    return matchesSearch && matchesActionFilter && matchesUserFilter;
  });

  const exportLogs = () => {
    const csvContent = [
      ['Date/Time', 'User Email', 'User Name', 'Action Type', 'Description', 'IP Address'],
      ...filteredLogs.map(log => [
        format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss'),
        log.user_email,
        log.user_name,
        log.action_type,
        log.action_description,
        log.ip_address || ''
      ])
    ].map(row => row.map(field => `"${field}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `user_activity_logs_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Activity logs exported successfully');
  };

  const uniqueActionTypes = [...new Set(logs.map(log => log.action_type))];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onClose}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="h-6 w-6" />
              All User Activity Logs
            </h2>
            <p className="text-muted-foreground">
              Comprehensive audit trail of all user actions
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportLogs}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <div className="text-sm text-muted-foreground flex items-center">
            {filteredLogs.length} of {logs.length} logs
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users, actions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {uniqueActionTypes.map(actionType => (
                  <SelectItem key={actionType} value={actionType}>
                    {actionType.replace('_', ' ').toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {users.map(user => (
                  <SelectItem key={user.email} value={user.email}>
                    {user.name} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('');
                setActionFilter('all');
                setUserFilter('all');
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Activity Logs Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date/Time</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">
                          {format(new Date(log.created_at), 'dd/MM/yyyy')}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(log.created_at), 'HH:mm:ss')}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{log.user_name}</div>
                      <div className="text-sm text-muted-foreground">{log.user_email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getActionBadgeColor(log.action_type)}>
                      {log.action_type.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>{log.action_description}</TableCell>
                  <TableCell>
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div className="text-sm text-muted-foreground">
                        {Object.entries(log.metadata).map(([key, value]) => (
                          <div key={key}>
                            <span className="font-medium">{key}:</span> {String(value)}
                          </div>
                        ))}
                      </div>
                    )}
                    {log.ip_address && (
                      <div className="text-xs text-muted-foreground mt-1">
                        IP: {log.ip_address}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {filteredLogs.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Activity className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No activity logs found</h3>
            <p className="text-muted-foreground text-center">
              {logs.length === 0
                ? "No user activity has been logged yet."
                : "Try adjusting your search criteria or filters."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};