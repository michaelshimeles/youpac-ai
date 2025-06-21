import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2, Plus, X, User, Globe, Target, Palette } from "lucide-react";
import { Button } from "~/components/ui/button";
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

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Configure your YouTube channel profile for personalized AI content
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Form */}
        <Card>
          <CardHeader>
            <CardTitle>Channel Profile</CardTitle>
            <CardDescription>
              This information helps generate content tailored to your channel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="channelName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Channel Name</FormLabel>
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
                      <FormLabel>Content Type</FormLabel>
                      <FormControl>
                        <Input placeholder="Educational Technology" {...field} />
                      </FormControl>
                      <FormDescription>
                        The type of content you create (e.g., tutorials, reviews, vlogs)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="niche"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Niche</FormLabel>
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

                <FormField
                  control={form.control}
                  name="tone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tone & Style</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Professional yet approachable, with a focus on clarity..."
                          className="resize-none"
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
                      <FormLabel>Target Audience</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Beginner to intermediate developers looking to..."
                          className="resize-none"
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

                <div className="space-y-2">
                  <FormLabel>Channel Links</FormLabel>
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
                    <Button type="button" size="icon" onClick={addLink}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {links.map((link, index) => (
                      <Badge key={index} variant="secondary" className="pr-1">
                        <span className="max-w-[200px] truncate">{link}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 ml-1"
                          onClick={() => removeLink(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Profile
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Profile Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Preview</CardTitle>
            <CardDescription>
              How the AI sees your channel
            </CardDescription>
          </CardHeader>
          <CardContent>
            {profile ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-semibold">{profile.channelName}</p>
                    <p className="text-sm text-muted-foreground">Channel Name</p>
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-semibold">{profile.contentType}</p>
                    <p className="text-sm text-muted-foreground">{profile.niche}</p>
                  </div>
                </div>
                
                {profile.tone && (
                  <>
                    <Separator />
                    <div className="flex items-start gap-3">
                      <Palette className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Tone & Style</p>
                        <p className="text-sm text-muted-foreground">{profile.tone}</p>
                      </div>
                    </div>
                  </>
                )}
                
                {profile.targetAudience && (
                  <>
                    <Separator />
                    <div className="flex items-start gap-3">
                      <Target className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Target Audience</p>
                        <p className="text-sm text-muted-foreground">{profile.targetAudience}</p>
                      </div>
                    </div>
                  </>
                )}
                
                {profile.links.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium mb-2">Channel Links</p>
                      <div className="space-y-1">
                        {profile.links.map((link, index) => (
                          <a
                            key={index}
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline block truncate"
                          >
                            {link}
                          </a>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">
                Complete your profile to see a preview
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}