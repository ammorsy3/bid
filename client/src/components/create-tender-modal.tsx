import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth";
import { CloudUpload, Copy, Check, Mail, ExternalLink } from "lucide-react";
import { useState } from "react";
import type { Tender } from "@shared/schema";

const createTenderSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  deadline: z.string().min(1, "Deadline is required"),
  budget: z.string().optional(),
  duration: z.string().optional(),
});

type CreateTenderForm = z.infer<typeof createTenderSchema>;

interface CreateTenderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateTenderModal({ isOpen, onClose }: CreateTenderModalProps) {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createdTender, setCreatedTender] = useState<Tender | null>(null);
  const [invitationCopied, setInvitationCopied] = useState(false);

  // No longer need to fetch vendors since we're using email invitations

  const form = useForm<CreateTenderForm>({
    resolver: zodResolver(createTenderSchema),
    defaultValues: {
      title: "",
      description: "",
      deadline: "",
      budget: "",
      duration: "",
    },
  });

  const createTenderMutation = useMutation({
    mutationFn: async (data: CreateTenderForm) => {
      const response = await apiRequest('POST', '/api/tenders', data);
      return response.json();
    },
    onSuccess: (tender: Tender) => {
      setCreatedTender(tender);
      queryClient.invalidateQueries({ queryKey: ['/api/tenders'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create tender",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateTenderForm) => {
    createTenderMutation.mutate(data);
  };

  const handleClose = () => {
    onClose();
    form.reset();
    setCreatedTender(null);
    setInvitationCopied(false);
  };

  const copyInvitationLink = async () => {
    if (!createdTender) return;
    
    const invitationLink = `${window.location.origin}/invite/${createdTender.invitationToken}`;
    try {
      await navigator.clipboard.writeText(invitationLink);
      setInvitationCopied(true);
      setTimeout(() => setInvitationCopied(false), 2000);
      toast({
        title: "Copied!",
        description: "Invitation link copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
    }
  };

  const copyInvitationMessage = async () => {
    if (!createdTender) return;
    
    const invitationLink = `${window.location.origin}/invite/${createdTender.invitationToken}`;
    const message = `You're invited to submit an offer for "${createdTender.title}"\n\nTender Details:\n- Budget: ${createdTender.budget || 'Not specified'}\n- Deadline: ${createdTender.deadline}\n- Duration: ${createdTender.duration || 'Not specified'}\n\nClick here to view details and submit your offer:\n${invitationLink}`;
    
    try {
      await navigator.clipboard.writeText(message);
      toast({
        title: "Copied!",
        description: "Invitation message copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy message",
        variant: "destructive",
      });
    }
  };

  const goToTenderDetails = () => {
    if (!createdTender) return;
    handleClose();
    window.location.href = `/tenders/${createdTender.id}`;
  };

  // Show success state with invitation link after creation
  if (createdTender) {
    const invitationLink = `${window.location.origin}/invite/${createdTender.invitationToken}`;
    
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold text-success-600 flex items-center gap-2">
              <Check className="h-6 w-6" />
              Tender Created Successfully!
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-medium text-neutral-900 mb-2">{createdTender.title}</h3>
              <p className="text-neutral-600">Your tender is now live and ready for vendor invitations</p>
            </div>
            
            <Card className="bg-primary-50 border-primary-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Mail className="h-5 w-5 text-primary-600" />
                  <h4 className="font-semibold text-primary-900">Invitation Link</h4>
                </div>
                <p className="text-sm text-primary-800 mb-4">
                  Share this link with qualified vendors to invite them to submit offers:
                </p>
                <div className="bg-white rounded-lg p-3 mb-4">
                  <code className="text-sm text-primary-900 break-all font-mono">{invitationLink}</code>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={copyInvitationLink}
                    size="sm"
                    className="flex-1"
                    data-testid="button-copy-link"
                  >
                    {invitationCopied ? (
                      <><Check className="h-4 w-4 mr-2" />Copied!</>
                    ) : (
                      <><Copy className="h-4 w-4 mr-2" />Copy Link</>
                    )}
                  </Button>
                  <Button 
                    onClick={copyInvitationMessage}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    data-testid="button-copy-message"
                  >
                    <Mail className="h-4 w-4 mr-2" />Copy Message
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
              <h4 className="font-medium text-neutral-900 mb-2">Next Steps</h4>
              <ul className="text-sm text-neutral-600 space-y-1">
                <li>• Share the invitation link with qualified vendors via email or messaging</li>
                <li>• Vendors can register and submit offers using this link</li>
                <li>• Monitor submissions from your dashboard</li>
              </ul>
            </div>
            
            <div className="flex gap-3 pt-4 border-t border-neutral-200">
              <Button 
                variant="outline" 
                onClick={handleClose}
                className="flex-1"
                data-testid="button-close-modal"
              >
                Close
              </Button>
              <Button 
                onClick={goToTenderDetails}
                className="flex-1 bg-primary-600 hover:bg-primary-700"
                data-testid="button-view-tender"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Tender Details
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-neutral-900">Create New Tender</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tender Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter tender title..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      rows={4} 
                      placeholder="Provide detailed requirements and specifications..." 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="deadline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Submission Deadline</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="budget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Budget</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select budget range" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="$10,000 - $25,000">$10,000 - $25,000</SelectItem>
                        <SelectItem value="$25,000 - $50,000">$25,000 - $50,000</SelectItem>
                        <SelectItem value="$50,000 - $100,000">$50,000 - $100,000</SelectItem>
                        <SelectItem value="$100,000+">$100,000+</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div>
              <FormLabel className="text-sm font-medium text-neutral-700 mb-2 block">Attachments</FormLabel>
              <div className="border-2 border-dashed border-neutral-300 rounded-lg p-8 text-center hover:border-primary-400 transition-colors cursor-pointer">
                <CloudUpload className="mx-auto h-8 w-8 text-neutral-400 mb-4" />
                <p className="text-neutral-600 mb-2">Drag and drop files here, or click to browse</p>
                <p className="text-sm text-neutral-500">Supports PDF, DOC, DOCX up to 10MB</p>
              </div>
            </div>

            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
              <h4 className="font-medium text-neutral-900 mb-2">Invitation Link</h4>
              <p className="text-sm text-neutral-600 mb-3">
                After creating this tender, you'll get a unique invitation link to share with vendors manually via email, messaging, or any communication method you prefer.
              </p>
              <div className="flex items-center space-x-2 text-xs text-neutral-500">
                <span>•</span>
                <span>Share the link only with qualified vendors</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-neutral-500 mt-1">
                <span>•</span>
                <span>Vendors can register and submit offers using this link</span>
              </div>
            </div>

            <div className="flex space-x-4 pt-4 border-t border-neutral-200">
              <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button 
                type="button" 
                className="flex-1 bg-primary-600 hover:bg-primary-700"
                disabled={createTenderMutation.isPending}
                data-testid="button-publish-tender"
                onClick={() => {
                  form.handleSubmit(onSubmit)();
                }}
              >
                {createTenderMutation.isPending ? "Creating..." : "Publish & Send Invitations"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
