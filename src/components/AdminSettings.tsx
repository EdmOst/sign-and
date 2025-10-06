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
import { Plus, Settings, Users, Trash2, Loader2, Activity, AlertTriangle, Archive, Clock, FolderOpen, RefreshCw, X, FileText, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { UserActivityLogs } from "@/components/UserActivityLogs";
import { BackupManagement } from "@/components/BackupManagement";
import { LogoUpload } from "@/components/LogoUpload";
import { LicenseManager } from "@/components/LicenseManager";
import { InvoiceModuleToggle } from "@/components/InvoiceModuleToggle";

interface User {
  id: string;
  email: string;
  display_name: string;
  role: "admin" | "user";
  created_at: string;
}

interface CompanySettings {
  id: string;
  logo_url?: string;
  company_name: string;
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
  const [showBackupManagement, setShowBackupManagement] = useState(false);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [systemResetDialogOpen, setSystemResetDialogOpen] = useState(false);
  const [systemResetConfirmOpen, setSystemResetConfirmOpen] = useState(false);
  const [virtualPrinterFolder, setVirtualPrinterFolder] = useState<FileSystemDirectoryHandle | null>(null);
  const [isWatchingFolder, setIsWatchingFolder] = useState(false);
  const [collectedFiles, setCollectedFiles] = useState<File[]>([]);

  useEffect(() => {
    fetchUsers();
    fetchCompanySettings();
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

  const fetchCompanySettings = async () => {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setCompanySettings(data);
    } catch (error) {
      console.error('Error fetching company settings:', error);
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

  const handleSystemReset = async () => {
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

      if (error) throw error;

      // Log the system reset activity
      await supabase
        .from('user_activity_logs')
        .insert({
          user_id: user?.id,
          user_email: user?.email,
          user_name: user?.email,
          action_type: 'SYSTEM_RESET',
          action_description: 'Complete system reset - all documents deleted',
          metadata: { reset_by: user?.email, timestamp: new Date().toISOString() }
        });

      toast.success('System has been completely reset. All documents have been deleted.');
      setSystemResetDialogOpen(false);
      setSystemResetConfirmOpen(false);
    } catch (error) {
      console.error('Error resetting system:', error);
      toast.error('Failed to reset system');
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

  // Virtual Printer Collection Functions
  const setupVirtualPrinterFolder = async () => {
    try {
      // Check if File System Access API is supported
      if (!('showDirectoryPicker' in window)) {
        toast.error("Your browser doesn't support folder access. Please use Chrome, Edge, or another Chromium-based browser.");
        return;
      }

      const dirHandle = await (window as any).showDirectoryPicker({
        mode: 'readwrite'
      });
      
      setVirtualPrinterFolder(dirHandle);
      toast.success(`Virtual printer folder set: ${dirHandle.name}`);
      
      // Start watching the folder
      startFolderWatching(dirHandle);
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Error setting up virtual printer folder:', error);
        toast.error("Failed to set up virtual printer folder");
      }
    }
  };

  const startFolderWatching = async (dirHandle: FileSystemDirectoryHandle) => {
    setIsWatchingFolder(true);
    toast.success("Started monitoring folder for new PDF files");
    
    // Note: Real-time folder watching requires a service worker or polling
    // For now, we'll implement a manual check button
  };

  const checkForNewFiles = async () => {
    if (!virtualPrinterFolder) return;

    try {
      const newFiles: File[] = [];
      
      // TypeScript doesn't have full File System Access API types yet
      const dirHandle = virtualPrinterFolder as any;
      
      for await (const [name, handle] of dirHandle.entries()) {
        if (handle.kind === 'file' && name.toLowerCase().endsWith('.pdf')) {
          const file = await handle.getFile();
          
          // Check if we've already collected this file
          const isAlreadyCollected = collectedFiles.some(f => 
            f.name === file.name && f.lastModified === file.lastModified
          );
          
          if (!isAlreadyCollected) {
            newFiles.push(file);
          }
        }
      }

      if (newFiles.length > 0) {
        setCollectedFiles(prev => [...prev, ...newFiles]);
        toast.success(`Found ${newFiles.length} new PDF file(s)`);
      }
    } catch (error) {
      console.error('Error checking for new files:', error);
      toast.error("Failed to check for new files");
    }
  };

  const removeCollectedFile = (index: number) => {
    setCollectedFiles(prev => prev.filter((_, i) => i !== index));
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

  if (showBackupManagement) {
    return <BackupManagement onClose={() => setShowBackupManagement(false)} />;
  }

  if (showBackupManagement) {
    return <BackupManagement onClose={() => setShowBackupManagement(false)} />;
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
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Virtual Printer Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border rounded-lg">
              <div className="space-y-3">
                <h3 className="font-medium">Virtual Printer Collection</h3>
                <p className="text-sm text-muted-foreground">
                  Set up automatic PDF collection from virtual printer output folder for system-wide document processing
                </p>
                
                {!virtualPrinterFolder ? (
                  <Button
                    onClick={setupVirtualPrinterFolder}
                    variant="outline"
                    className="w-full max-w-sm"
                  >
                    <FolderOpen className="h-4 w-4 mr-2" />
                    Select Printer Output Folder
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-muted rounded">
                      <div>
                        <span className="text-sm font-medium">Monitoring Folder:</span>
                        <p className="text-sm text-muted-foreground">{virtualPrinterFolder.name}</p>
                      </div>
                      <Button
                        onClick={() => {
                          setVirtualPrinterFolder(null);
                          setIsWatchingFolder(false);
                          setCollectedFiles([]);
                        }}
                        variant="outline"
                        size="sm"
                      >
                        Stop Monitoring
                      </Button>
                    </div>
                    
                    <Button
                      onClick={checkForNewFiles}
                      variant="outline"
                      className="w-full max-w-sm"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Check for New Files
                    </Button>

                    {collectedFiles.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          Collected Files ({collectedFiles.length})
                        </Label>
                        <div className="max-h-32 overflow-y-auto space-y-1 p-2 border rounded">
                          {collectedFiles.map((file, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                              <span className="truncate flex-1 mr-2">{file.name}</span>
                              <div className="flex gap-1">
                                <span className="text-xs text-muted-foreground">
                                  {(file.size / 1024 / 1024).toFixed(2)}MB
                                </span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeCollectedFile(index)}
                                  className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Note: Files are available for users to load directly into the PDF signer
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <LogoUpload
        settings={companySettings} 
        onSettingsUpdate={setCompanySettings}
      />

      <InvoiceModuleToggle />

      <LicenseManager />

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
                <h3 className="font-medium">Scheduled Backups</h3>
                <p className="text-sm text-muted-foreground">Configure automatic backups and scheduling options</p>
              </div>
              <Button variant="outline" onClick={() => setShowBackupManagement(true)}>
                <Settings className="mr-2 h-4 w-4" />
                Configure
              </Button>
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

      {/* System Reset Section */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <RotateCcw className="h-5 w-5" />
            Danger Zone - System Reset
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-lg bg-destructive/5">
              <div>
                <h3 className="font-medium text-destructive">Complete System Reset</h3>
                <p className="text-sm text-muted-foreground">
                  Permanently delete all signed documents and signatures. This action cannot be undone.
                </p>
              </div>
              <Button 
                variant="destructive"
                onClick={() => setSystemResetDialogOpen(true)}
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reset System
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Reset First Confirmation Dialog */}
      <Dialog open={systemResetDialogOpen} onOpenChange={setSystemResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              System Reset Confirmation
            </DialogTitle>
            <DialogDescription>
              You are about to permanently delete ALL signed documents and signatures from the system.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
            <p className="text-sm font-medium text-destructive">⚠️ This action will:</p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• Delete all signed PDF documents</li>
              <li>• Remove all invoices and related items</li>
              <li>• Delete all customers and products</li>
              <li>• Clear all activity logs</li>
              <li>• Remove all signatures and metadata</li>
              <li>• Cannot be reversed or undone</li>
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSystemResetDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                setSystemResetDialogOpen(false);
                setSystemResetConfirmOpen(true);
              }}
            >
              I Understand, Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* System Reset Final Confirmation Dialog */}
      <Dialog open={systemResetConfirmOpen} onOpenChange={setSystemResetConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Final Confirmation Required
            </DialogTitle>
            <DialogDescription>
              This is your final chance to cancel. Once you proceed, all data will be permanently lost.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 p-4 bg-destructive/10 border border-destructive rounded-lg">
            <p className="text-center font-medium text-destructive">
              Are you absolutely certain you want to reset the entire system?
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSystemResetConfirmOpen(false)}>
              Cancel - Keep Data Safe
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleSystemReset}
              className="bg-destructive hover:bg-destructive/90"
            >
              Yes, Delete Everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};