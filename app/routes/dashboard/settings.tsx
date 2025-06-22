import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";
import { 
  Loader2, Plus, X, User, Globe, Target, Palette, 
  Youtube, Link2, Sparkles, Save, Eye, Hash,
  MessageSquare, Users, TrendingUp, Video
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import { cn } from "~/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";

const profileSchema = z.object({
  channelName: z.string().min(1, "Channel name is required"),
  contentType: z.string().min(1, "Content type is required"),
  niche: z.string().min(1, "Niche is required"),
  links: z.array(z.string()).default([]),
  tone: z.string().optional(),
  targetAudience: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function Page() {
  const profile = useQuery(api.profiles.get);
  const upsertProfile = useMutation(api.profiles.upsert);
  const [links, setLinks] = useState<string[]>([]);
  const [newLink, setNewLink] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      channelName: "",
      contentType: "",
      niche: "",
      links: [],
      tone: "",
      targetAudience: "",
    },
  });

  // Load existing profile data
  useEffect(() => {
    if (profile) {
      form.reset({
        channelName: profile.channelName,
        contentType: profile.contentType,
        niche: profile.niche,
        links: profile.links,
        tone: profile.tone || "",
        targetAudience: profile.targetAudience || "",
      });
      setLinks(profile.links);
    }
  }, [profile, form]);

  const onSubmit = async (values: ProfileFormValues) => {
    setIsSubmitting(true);
    try {
      await upsertProfile({
        ...values,
        links,
      });
      toast.success("Profile saved successfully!");
    } catch (error) {
      toast.error("Failed to save profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addLink = () => {
    if (!newLink) return;
    
    try {
      new URL(newLink);
      setLinks([...links, newLink]);
      setNewLink("");
    } catch {
      toast.error("Please enter a valid URL");
    }
  };

  const removeLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  // Calculate profile completion
  const calculateCompletion = () => {
    if (!profile) return 0;
    let score = 0;
    const fields = [
      profile.channelName,
      profile.contentType,
      profile.niche,
      profile.tone,
      profile.targetAudience,
      profile.links.length > 0
    ];
    fields.forEach(field => {
      if (field) score += 100 / fields.length;
    });
    return Math.round(score);
  };

  const completionPercentage = calculateCompletion();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-96 h-96 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-gradient-to-tr from-primary/10 via-primary/5 to-transparent rounded-full blur-3xl" />
      </div>
      
      <div className="relative space-y-8 p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
              <Youtube className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Channel Settings</h1>
              <p className="text-muted-foreground">
                Configure your YouTube channel profile for personalized AI content
              </p>
            </div>
          </div>
          
          {/* Profile Completion */}
          <Card className="border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Profile Completion</span>
                <span className="text-sm font-bold text-primary">{completionPercentage}%</span>
              </div>
              <Progress value={completionPercentage} className="h-2" />
              {completionPercentage < 100 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Complete your profile for better AI-generated content
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form - 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card className="p-0 rounded">
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6 border-b">
                <CardHeader className="p-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-background/80 backdrop-blur">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Basic Information</CardTitle>
                      <CardDescription>
                        Tell us about your YouTube channel
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </div>
              <CardContent className="p-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6">
                    <div className="grid gap-6 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="channelName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Youtube className="h-4 w-4" />
                              Channel Name
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="Tech Tutorials Pro" {...field} />
                            </FormControl>
                            <FormDescription>
                              Your YouTube channel name
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="contentType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Video className="h-4 w-4" />
                              Content Type
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="Educational Technology" {...field} />
                            </FormControl>
                            <FormDescription>
                              Type of content (tutorials, reviews, vlogs)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="niche"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Hash className="h-4 w-4" />
                            Niche
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="Web Development" {...field} />
                          </FormControl>
                          <FormDescription>
                            Your specific area of focus
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Advanced Settings */}
            <Card className="p-0 rounded">
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6 border-b">
                <CardHeader className="p-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-background/80 backdrop-blur">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Content Style</CardTitle>
                      <CardDescription>
                        Define your unique voice and audience
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </div>
              
              <CardContent className="p-6">
                <Form {...form}>
                  <form className="space-y-6">

                    <FormField
                      control={form.control}
                      name="tone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            Tone & Style
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Professional yet approachable, with a focus on clarity..."
                              className="resize-none min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Describe your communication style
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="targetAudience"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Target Audience
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Beginner to intermediate developers looking to..."
                              className="resize-none min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Who watches your content
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-3">
                      <FormLabel className="flex items-center gap-2">
                        <Link2 className="h-4 w-4" />
                        Channel Links
                      </FormLabel>
                      <div className="flex gap-2">
                        <Input
                          value={newLink}
                          onChange={(e) => setNewLink(e.target.value)}
                          placeholder="https://youtube.com/@yourchannel"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addLink();
                            }
                          }}
                        />
                        <Button 
                          type="button" 
                          size="icon" 
                          onClick={addLink}
                          className="shrink-0"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {links.length > 0 && (
                        <div className="rounded-lg border bg-muted/50 p-3">
                          <div className="flex flex-wrap gap-2">
                            {links.map((link, index) => (
                              <Badge 
                                key={index} 
                                variant="secondary" 
                                className="pr-1 gap-1"
                              >
                                <Link2 className="h-3 w-3" />
                                <span className="max-w-[200px] truncate">{link}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-4 w-4 ml-1 hover:bg-destructive/20"
                                  onClick={() => removeLink(index)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
            
            {/* Save Button */}
            <div className="flex justify-end">
              <Button 
                onClick={form.handleSubmit(onSubmit as any)}
                disabled={isSubmitting}
                size="lg"
                className="gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save All Changes
              </Button>
            </div>
          </div>

          {/* Profile Preview - 1 column */}
          <div className="space-y-6">
          <Card className="p-0 rounded sticky top-6">
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6 border-b">
                <CardHeader className="p-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-background/80 backdrop-blur">
                      <Eye className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>AI Profile Preview</CardTitle>
                      <CardDescription>
                        How the AI understands your channel
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </div>
              <CardContent className="p-6">
                {profile ? (
                  <div className="space-y-4">
                    {/* Channel Overview */}
                    <div className="rounded-lg bg-gradient-to-br from-primary/5 to-transparent p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Youtube className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-lg">{profile.channelName}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {profile.contentType} • {profile.niche}
                          </p>
                        </div>
                      </div>
                    </div>
                
                    {/* Content Details */}
                    <div className="space-y-3">
                      {profile.tone && (
                        <div className="rounded-lg border bg-card/50 p-4">
                          <div className="flex items-start gap-3">
                            <MessageSquare className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div className="flex-1">
                              <p className="text-sm font-medium mb-1">Communication Style</p>
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {profile.tone}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {profile.targetAudience && (
                        <div className="rounded-lg border bg-card/50 p-4">
                          <div className="flex items-start gap-3">
                            <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div className="flex-1">
                              <p className="text-sm font-medium mb-1">Target Audience</p>
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {profile.targetAudience}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                
                    {profile.links.length > 0 && (
                      <div className="rounded-lg border bg-card/50 p-4">
                        <div className="flex items-start gap-3">
                          <Link2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium mb-2">Connected Links</p>
                            <div className="space-y-2">
                              {profile.links.map((link, index) => (
                                <a
                                  key={index}
                                  href={link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-primary hover:underline flex items-center gap-1 group"
                                >
                                  <span className="truncate">{link}</span>
                                  <TrendingUp className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </a>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* AI Understanding */}
                    <div className="rounded-lg bg-gradient-to-br from-primary/5 to-transparent border border-primary/20 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <p className="text-sm font-medium">AI Understanding</p>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Based on your profile, the AI will generate content optimized for {profile.niche} creators, 
                        with a {profile.tone ? "tone that matches your style" : "professional tone"}, 
                        targeting {profile.targetAudience || "your audience"}.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="p-3 rounded-full bg-muted/50 w-fit mx-auto mb-3">
                      <User className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">
                      Complete your profile to see how the AI will personalize your content
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}