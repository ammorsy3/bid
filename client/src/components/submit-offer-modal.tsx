import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { FileText, DollarSign, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

const submitOfferSchema = z.object({
  technicalFileUrl: z.string().optional(),
  financialFileUrl: z.string().optional(),
  notes: z.string().optional(),
});

type SubmitOfferForm = z.infer<typeof submitOfferSchema>;

interface SubmitOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  tender: {
    id: string;
    title: string;
    deadline: string;
  };
  requester: {
    name: string;
    company?: string;
  };
}

export default function SubmitOfferModal({ isOpen, onClose, tender, requester }: SubmitOfferModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<SubmitOfferForm>({
    resolver: zodResolver(submitOfferSchema),
    defaultValues: {
      technicalFileUrl: "",
      financialFileUrl: "",
      notes: "",
    },
  });

  const submitOfferMutation = useMutation({
    mutationFn: async (data: SubmitOfferForm) => {
      const response = await apiRequest('POST', `/api/tenders/${tender.id}/offers`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Offer submitted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tenders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/my-offers'] });
      onClose();
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit offer",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SubmitOfferForm) => {
    submitOfferMutation.mutate(data);
  };

  const handleClose = () => {
    onClose();
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-neutral-900">Submit Offer</DialogTitle>
          <p className="text-neutral-600 mt-2">{tender.title} - {requester.company || requester.name}</p>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <FormLabel className="text-sm font-medium text-neutral-700 mb-2 block">Technical Proposal</FormLabel>
              <div className="border-2 border-dashed border-neutral-300 rounded-lg p-6 text-center hover:border-primary-400 transition-colors cursor-pointer">
                <FileText className="mx-auto h-6 w-6 text-neutral-400 mb-2" />
                <p className="text-sm text-neutral-600 mb-1">Upload technical proposal (PDF)</p>
                <p className="text-xs text-neutral-500">Max size: 10MB</p>
              </div>
            </div>

            <div>
              <FormLabel className="text-sm font-medium text-neutral-700 mb-2 block">Financial Proposal</FormLabel>
              <div className="border-2 border-dashed border-neutral-300 rounded-lg p-6 text-center hover:border-primary-400 transition-colors cursor-pointer">
                <DollarSign className="mx-auto h-6 w-6 text-neutral-400 mb-2" />
                <p className="text-sm text-neutral-600 mb-1">Upload financial proposal (PDF)</p>
                <p className="text-xs text-neutral-500">Max size: 10MB</p>
              </div>
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      rows={4} 
                      placeholder="Any additional information or clarifications..." 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="bg-neutral-50 rounded-lg p-4">
              <h4 className="font-medium text-neutral-900 mb-2">Submission Summary</h4>
              <div className="space-y-2 text-sm text-neutral-600">
                <div className="flex justify-between">
                  <span>Tender:</span>
                  <span className="font-medium">{tender.title}</span>
                </div>
                <div className="flex justify-between">
                  <span>Client:</span>
                  <span className="font-medium">{requester.company || requester.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Deadline:</span>
                  <span className="font-medium text-warning-600">
                    {format(new Date(tender.deadline), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-4 bg-warning-50 rounded-lg border border-warning-200">
              <AlertTriangle className="h-5 w-5 text-warning-600 flex-shrink-0" />
              <p className="text-sm text-warning-800">
                Once submitted, you cannot modify your offer. Please review all documents carefully.
              </p>
            </div>

            <div className="flex space-x-4 pt-4 border-t border-neutral-200">
              <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="flex-1 bg-primary-600 hover:bg-primary-700"
                disabled={submitOfferMutation.isPending}
              >
                {submitOfferMutation.isPending ? "Submitting..." : "Submit Offer"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
