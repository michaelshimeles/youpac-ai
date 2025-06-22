import { Link } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useState, useEffect } from "react";
import { Plus, Video, Calendar, Archive, MoreVertical, Settings, User, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export default function Page() {
  const projects = useQuery(api.projects.list, { includeArchived: false });
  const profile = useQuery(api.profiles.get);
  const createProject = useMutation(api.projects.create);
  const archiveProject = useMutation(api.projects.update);
  const deleteProject = useMutation(api.projects.remove);
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [newProject, setNewProject] = useState({
    title: "",
    description: "",
  });

  // Check if profile is incomplete on first visit
  useEffect(() => {
    if (profile !== undefined) {
      const isIncomplete = !profile || !profile.channelName || !profile.contentType || !profile.niche;
      if (isIncomplete && !localStorage.getItem('profileDialogDismissed')) {
        setShowProfileDialog(true);
      }
    }
  }, [profile]);

  const handleDismissProfileDialog = () => {
    setShowProfileDialog(false);
    localStorage.setItem('profileDialogDismissed', 'true');
  };

  const handleCreateProject = async () => {
    if (!newProject.title.trim()) {
      toast.error("Project title is required");
      return;
    }

    try {
      const projectId = await createProject({
        title: newProject.title,
        description: newProject.description || undefined,
      });
      
      toast.success("Project created successfully!");
      setIsCreateOpen(false);
      setNewProject({ title: "", description: "" });
      
      // Navigate to the new project canvas
      window.location.href = `/dashboard/project/${projectId}`;
    } catch (error) {
      toast.error("Failed to create project");
    }
  };

  const handleArchive = async (projectId: string) => {
    try {
      await archiveProject({
        id: projectId as Id<"projects">,
        isArchived: true,
      });
      toast.success("Project archived");
    } catch (error) {
      toast.error("Failed to archive project");
    }
  };

  const handleDelete = async (projectId: string) => {
    if (!confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteProject({ id: projectId as Id<"projects"> });
      toast.success("Project deleted");
    } catch (error) {
      toast.error("Failed to delete project");
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Profile Completion Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <DialogTitle className="text-xl">Complete Your Profile</DialogTitle>
            </div>
            <DialogDescription className="text-base">
              Set up your YouTube channel profile to get personalized AI-generated content that matches your style and audience.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="rounded-lg border bg-muted/50 p-4">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Why complete your profile?
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>AI generates content tailored to your channel's niche</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Matches your unique tone and communication style</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Targets your specific audience demographics</span>
                </li>
              </ul>
            </div>
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleDismissProfileDialog}
              className="sm:flex-1"
            >
              Skip for now
            </Button>
            <Button asChild className="sm:flex-1 gap-2">
              <Link to="/dashboard/settings">
                <Settings className="h-4 w-4" />
                Go to Settings
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground">
            Create and manage your YouTube video projects
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {profile && (!profile.channelName || !profile.contentType || !profile.niche) && (
            <Button variant="outline" size="sm" asChild className="gap-2">
              <Link to="/dashboard/settings">
                <User className="h-4 w-4" />
                Complete Profile
              </Link>
            </Button>
          )}
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Each project is a canvas for creating content for one video
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Project Title</Label>
                <Input
                  id="title"
                  placeholder="My Awesome Video"
                  value={newProject.title}
                  onChange={(e) =>
                    setNewProject({ ...newProject, title: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of your video project..."
                  value={newProject.description}
                  onChange={(e) =>
                    setNewProject({ ...newProject, description: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateProject}>Create Project</Button>
            </DialogFooter>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {projects === undefined ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 w-3/4 bg-muted rounded" />
                <div className="h-3 w-1/2 bg-muted rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-32 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Video className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first project to start generating YouTube content
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project._id} className="group relative overflow-hidden">
              <Link to={`/dashboard/project/${project._id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="line-clamp-1">
                        {project.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-2">
                        {project.description || "No description"}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            handleArchive(project._id);
                          }}
                        >
                          <Archive className="mr-2 h-4 w-4" />
                          Archive
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => {
                            e.preventDefault();
                            handleDelete(project._id);
                          }}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardFooter>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="mr-1 h-3 w-3" />
                    {formatDistanceToNow(new Date(project.updatedAt), {
                      addSuffix: true,
                    })}
                  </div>
                </CardFooter>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
