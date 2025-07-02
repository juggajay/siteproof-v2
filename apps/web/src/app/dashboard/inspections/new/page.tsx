'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  PageLayout,
  Card,
  CardHeader,
  CardContent,
  Button,
  Input,
  Textarea,
  Select,
  Label,
  FormError,
} from '@siteproof/design-system';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const createInspectionSchema = z.object({
  template_id: z.string().min(1, 'Please select a template'),
  project_id: z.string().min(1, 'Please select a project'),
  lot_id: z.string().optional(),
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().optional(),
  assigned_to: z.string().optional(),
  due_date: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
});

type FormData = z.infer<typeof createInspectionSchema>;

export default function NewInspectionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get('template');

  const [templates, setTemplates] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [lots, setLots] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(createInspectionSchema),
    defaultValues: {
      template_id: templateId || '',
      priority: 'normal',
    },
  });

  const selectedProjectId = watch('project_id');
  const selectedTemplateId = watch('template_id');

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        // Load templates
        const templatesRes = await fetch('/api/itp/templates?is_active=true');
        const templatesData = await templatesRes.json();
        setTemplates(templatesData.templates || []);

        // Load projects
        const projectsRes = await fetch('/api/projects');
        const projectsData = await projectsRes.json();
        setProjects(projectsData.projects || []);

        // Load organization users
        const usersRes = await fetch('/api/organization/members');
        const usersData = await usersRes.json();
        setUsers(usersData.members || []);
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Load lots when project changes
  useEffect(() => {
    if (selectedProjectId) {
      fetch(`/api/projects/${selectedProjectId}/lots`)
        .then((res) => res.json())
        .then((data) => setLots(data.lots || []))
        .catch((error) => {
          console.error('Error loading lots:', error);
          setLots([]);
        });
    } else {
      setLots([]);
    }
  }, [selectedProjectId]);

  // Update name when template changes
  useEffect(() => {
    if (selectedTemplateId) {
      const template = templates.find((t) => t.id === selectedTemplateId);
      if (template) {
        setValue('name', template.name);
      }
    }
  }, [selectedTemplateId, templates, setValue]);

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      const response = await fetch('/api/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create inspection');
      }

      const result = await response.json();
      toast.success('Inspection created successfully');
      router.push(`/dashboard/inspections/${result.instance.id}`);
    } catch (error) {
      console.error('Error creating inspection:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create inspection');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PageLayout hasTopNav={false} hasBottomNav={false}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <Card>
            <CardContent>
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout hasTopNav={false} hasBottomNav={false} maxWidth="md">
      <div className="mb-8">
        <Link
          href="/dashboard/inspections"
          className="inline-flex items-center text-body text-secondary-gray hover:text-primary-charcoal mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Inspections
        </Link>
        <h1 className="text-h1 text-primary-charcoal">New Inspection</h1>
        <p className="mt-2 text-body text-secondary-gray">
          Create a new inspection from a template
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <h2 className="text-h4 text-primary-charcoal">Inspection Details</h2>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Template Selection */}
            <div>
              <Label htmlFor="template_id">Template *</Label>
              <Select id="template_id" {...register('template_id')} className="mt-1">
                <option value="">Select a template</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} {template.category && `(${template.category})`}
                  </option>
                ))}
              </Select>
              {errors.template_id && <FormError>{errors.template_id.message}</FormError>}
            </div>

            {/* Project Selection */}
            <div>
              <Label htmlFor="project_id">Project *</Label>
              <Select id="project_id" {...register('project_id')} className="mt-1">
                <option value="">Select a project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </Select>
              {errors.project_id && <FormError>{errors.project_id.message}</FormError>}
            </div>

            {/* Lot Selection (optional) */}
            {lots.length > 0 && (
              <div>
                <Label htmlFor="lot_id">Lot (optional)</Label>
                <Select id="lot_id" {...register('lot_id')} className="mt-1">
                  <option value="">No specific lot</option>
                  {lots.map((lot) => (
                    <option key={lot.id} value={lot.id}>
                      Lot #{lot.lot_number} - {lot.name || 'Unnamed'}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {/* Inspection Name */}
            <div>
              <Label htmlFor="name">Inspection Name *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="e.g., Foundation Inspection - Block A"
                className="mt-1"
              />
              {errors.name && <FormError>{errors.name.message}</FormError>}
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Additional details about this inspection"
                rows={3}
                className="mt-1"
              />
            </div>

            {/* Assign To */}
            <div>
              <Label htmlFor="assigned_to">Assign To (optional)</Label>
              <Select id="assigned_to" {...register('assigned_to')} className="mt-1">
                <option value="">Assign to myself</option>
                {users.map((user) => (
                  <option key={user.user_id} value={user.user_id}>
                    {user.user?.full_name || user.user?.email}
                  </option>
                ))}
              </Select>
            </div>

            {/* Due Date */}
            <div>
              <Label htmlFor="due_date">Due Date (optional)</Label>
              <Input
                id="due_date"
                type="date"
                {...register('due_date')}
                min={new Date().toISOString().split('T')[0]}
                className="mt-1"
              />
            </div>

            {/* Priority */}
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select id="priority" {...register('priority')} className="mt-1">
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex gap-3 justify-end">
          <Link href="/dashboard/inspections">
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </Link>
          <Button type="submit" loading={submitting}>
            Create Inspection
          </Button>
        </div>
      </form>
    </PageLayout>
  );
}
