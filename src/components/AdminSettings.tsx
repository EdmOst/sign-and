import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Settings, Users, Trash2, Loader2, Activity, AlertTriangle, Download, Archive, Clock, FolderOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { UserActivityLogs } from "@/components/UserActivityLogs";

interface User {
  id: string;
  email: string;
  display_name: string;
  role: "admin" | "user";
  created_at: string;
}

export const AdminSettings: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [addUserLoading, setAddUserLoading] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [showActivityLogs, setShowActivityLogs] = useState(false);
  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [backupLoading, setBackupLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // First get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, user_id, email, display_name, created_at");

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        toast.error("Failed to fetch users");
        return;
      }

      // Then get roles for each user
      const usersWithRoles = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", profile.user_id)
            .maybeSingle();

          return {
            id: profile.user_id,
            email: profile.email,
            display_name: profile.display_name,
            role: roleData?.role || "user",
            created_at: profile.created_at,
          };
        })
      );

      setUsers(usersWithRoles);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAddUserLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const displayName = formData.get("displayName") as string;
    const role = formData.get("role") as "admin" | "user";
    const password = formData.get("password") as string;

    try {
      // Create user account with admin privileges
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        user_metadata: {
          display_name: displayName,
        },
        email_confirm: true,
      });

      if (authError) {
        console.error("Auth error:", authError);
        toast.error(`Failed to create user: ${authError.message}`);
        return;
      }

      if (authData.user) {
        // The trigger should automatically create the profile and default user role
        // Wait a moment for the trigger to complete
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Update the role if it's admin
        if (role === "admin") {
          const { error: roleError } = await supabase
            .from("user_roles")
            .update({ role: "admin" })
            .eq("user_id", authData.user.id);

          if (roleError) {
            console.error("Error updating user role:", roleError);
            toast.error("User created but failed to set admin role");
          }
        }

        // Log the activity
        await supabase
          .from('user_activity_logs')
          .insert({
            user_id: authData.user.id,
            user_email: email,
            user_name: displayName,
            action_type: 'USER_CREATED',
            action_description: `Admin created new user account`,
            metadata: { created_by: user?.email, assigned_role: role }
          });

        toast.success("User created successfully");
        setIsAddUserOpen(false);
        await fetchUsers();
        (e.target as HTMLFormElement).reset();
      }
    } catch (error) {
      console.error("Error creating user:", error);
      toast.error("Failed to create user");
    } finally {
      setAddUserLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    // Check if this is the last admin
    const adminCount = users.filter(u => u.role === 'admin').length;
    if (userToDelete.role === 'admin' && adminCount === 1) {
      toast.error("Cannot delete the last admin user. At least one admin is required.");
      setDeleteUserDialogOpen(false);
      setUserToDelete(null);
      return;
    }

    try {
      const { error } = await supabase.auth.admin.deleteUser(userToDelete.id);

      if (error) {
        toast.error(`Failed to delete user: ${error.message}`);
        return;
      }

      // Log the activity
      await supabase
        .from('user_activity_logs')
        .insert({
          user_id: userToDelete.id,
          user_email: userToDelete.email,
          user_name: userToDelete.display_name,
          action_type: 'USER_DELETED',
          action_description: `User account was deleted by admin`,
          metadata: { deleted_by: user?.email, user_role: userToDelete.role }
        });

      toast.success("User deleted successfully");
      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user");
    } finally {
      setDeleteUserDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const openDeleteDialog = (userToDelete: User) => {
    setUserToDelete(userToDelete);
    setDeleteUserDialogOpen(true);
  };

  const handleManualBackup = async () => {
    setBackupLoading(true);
    try {
      const { data: documents, error } = await supabase
        .from('documents')
        .select('*')
        .order('signed_at', { ascending: false });

      if (error) throw error;

      if (!documents || documents.length === 0) {
        toast.error('No documents found to backup');
        return;
      }

      // Create a ZIP file with all documents
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      // Add metadata file
      const metadata = {
        backup_date: new Date().toISOString(),
        total_documents: documents.length,
        generated_by: user?.email || 'admin',
        documents: documents.map(doc => ({
          id: doc.id,
          name: doc.original_filename,
          signed_at: doc.signed_at,
          signed_by: doc.signed_by_email,
          signatures_count: Array.isArray(doc.signatures) ? doc.signatures.length : 0
        }))
      };

      zip.file('backup_metadata.json', JSON.stringify(metadata, null, 2));

      // Add each document
      documents.forEach((doc, index) => {
        const fileName = `${index + 1}_${doc.original_filename}`;
        try {
          const binaryData = atob(doc.pdf_data);
          const bytes = new Uint8Array(binaryData.length);
          for (let i = 0; i < binaryData.length; i++) {
            bytes[i] = binaryData.charCodeAt(i);
          }
          zip.file(fileName, bytes);
        } catch (error) {
          console.error(`Error processing document ${doc.original_filename}:`, error);
        }
      });

      // Generate and download the ZIP
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = `documents_backup_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(url);

      // Log the backup activity
      await supabase
        .from('user_activity_logs')
        .insert({
          user_id: user?.id,
          user_email: user?.email,
          user_name: user?.email,
          action_type: 'BACKUP_CREATED',
          action_description: `Manual backup created with ${documents.length} documents`,
          metadata: { document_count: documents.length, backup_type: 'manual' }
        });

      toast.success(`Backup created successfully with ${documents.length} documents`);
    } catch (error) {
      console.error('Error creating backup:', error);
      toast.error('Failed to create backup');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: "admin" | "user") => {
    try {
      const targetUser = users.find(u => u.id === userId);
      const oldRole = targetUser?.role;

      // Check if trying to remove the last admin
      if (oldRole === 'admin' && newRole === 'user') {
        const adminCount = users.filter(u => u.role === 'admin').length;
        if (adminCount === 1) {
          toast.error("Cannot remove admin role from the last admin user. At least one admin is required.");
          return;
        }
      }

      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole })
        .eq("user_id", userId);

      if (error) {
        toast.error(`Failed to update user role: ${error.message}`);
        return;
      }

      // Log the activity
      await supabase
        .from('user_activity_logs')
        .insert({
          user_id: userId,
          user_email: targetUser?.email,
          user_name: targetUser?.display_name,
          action_type: 'USER_ROLE_CHANGE',
          action_description: `Role changed from ${oldRole} to ${newRole}`,
          metadata: { changed_by: user?.email, old_role: oldRole, new_role: newRole }
        });

      toast.success("User role updated successfully");
      await fetchUsers();
    } catch (error) {
      console.error("Error updating user role:", error);
      toast.error("Failed to update user role");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (showActivityLogs) {
    return <UserActivityLogs onClose={() => setShowActivityLogs(false)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Settings</h1>
          <p className="text-muted-foreground">Manage users and system settings</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowActivityLogs(true)}>
            <Activity className="mr-2 h-4 w-4" />
            All User Logs
          </Button>
          <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddUser} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="user@example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    name="displayName"
                    type="text"
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Temporary Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Temporary password"
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select name="role" defaultValue="user">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={addUserLoading}>
                  {addUserLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create User
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={deleteUserDialogOpen} onOpenChange={setDeleteUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirm User Deletion
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. Are you absolutely sure you want to delete this user account?
            </DialogDescription>
          </DialogHeader>
          {userToDelete && (
            <div className="space-y-2 p-4 bg-muted rounded-lg">
              <p><strong>Name:</strong> {userToDelete.display_name}</p>
              <p><strong>Email:</strong> {userToDelete.email}</p>
              <p><strong>Role:</strong> <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${userToDelete.role === 'admin' ? 'bg-destructive text-destructive-foreground' : 'bg-secondary text-secondary-foreground'}`}>{userToDelete.role}</span></p>
              {userToDelete.role === 'admin' && users.filter(u => u.role === 'admin').length === 1 && (
                <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded">
                  <p className="text-sm text-destructive font-medium">⚠️ This is the last admin user and cannot be deleted</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUserDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteUser}
              disabled={userToDelete?.role === 'admin' && users.filter(u => u.role === 'admin').length === 1}
            >
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.display_name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Select
                      value={user.role}
                      onValueChange={(newRole) => handleRoleChange(user.id, newRole as "admin" | "user")}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {/* Hide delete button if this is the only admin */}
                    {!(user.role === 'admin' && users.filter(u => u.role === 'admin').length === 1) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteDialog(user)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            System Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">Activity Monitoring</h3>
                <p className="text-sm text-muted-foreground">View comprehensive user activity logs and audit trail</p>
              </div>
              <Button variant="outline" onClick={() => setShowActivityLogs(true)}>
                <Activity className="mr-2 h-4 w-4" />
                View Logs
              </Button>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">Invoicing Module</h3>
                <p className="text-sm text-muted-foreground">Enable invoice creation and management</p>
              </div>
              <Badge variant="secondary">Coming Soon</Badge>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">Company Logo</h3>
                <p className="text-sm text-muted-foreground">Upload and manage company branding</p>
              </div>
              <Badge variant="secondary">Coming Soon</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Document Backup Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">Manual Backup</h3>
                <p className="text-sm text-muted-foreground">Download all signed documents as a ZIP file immediately</p>
              </div>
              <Button 
                onClick={handleManualBackup} 
                disabled={backupLoading}
                className="flex items-center gap-2"
              >
                {backupLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {backupLoading ? 'Creating...' : 'Download Backup'}
              </Button>
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">Scheduled Backups</h3>
                <p className="text-sm text-muted-foreground">Configure automatic backups to external storage or email</p>
              </div>
              <Badge variant="secondary">Coming Soon</Badge>
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">Backup History</h3>
                <p className="text-sm text-muted-foreground">View and manage previous backup operations</p>
              </div>
              <Button variant="outline" onClick={() => setShowActivityLogs(true)}>
                <Clock className="mr-2 h-4 w-4" />
                View History
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};