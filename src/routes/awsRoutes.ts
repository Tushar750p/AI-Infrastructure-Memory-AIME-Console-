import { Router, Request, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from './authRoutes.js';
import {
  getEc2Instances,
  executeEc2Action,
  getRdsInstances,
  getS3Buckets,
  getEksClusters,
  getCloudWatchMetrics,
  getCloudTrailEvents,
  runAwsSecurityAudit
} from '../services/awsService.js';

export const awsRouter = Router();

// GET /api/aws/ec2 - List EC2 instances
awsRouter.get('/aws/ec2', async (req: Request, res: Response) => {
  try {
    const instances = await getEc2Instances();
    res.json(instances);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/aws/rds - List RDS instances
awsRouter.get('/aws/rds', async (req: Request, res: Response) => {
  try {
    const rds = await getRdsInstances();
    res.json(rds);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/aws/s3 - List S3 Buckets
awsRouter.get('/aws/s3', async (req: Request, res: Response) => {
  try {
    const buckets = await getS3Buckets();
    res.json(buckets);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/aws/eks - List EKS Clusters
awsRouter.get('/aws/eks', async (req: Request, res: Response) => {
  try {
    const clusters = await getEksClusters();
    res.json(clusters);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/aws/cloudwatch - Get CloudWatch Metrics
awsRouter.get('/aws/cloudwatch', async (req: Request, res: Response) => {
  try {
    const metrics = await getCloudWatchMetrics();
    res.json(metrics);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/aws/cloudtrail - Get CloudTrail Audit Events
awsRouter.get('/aws/cloudtrail', async (req: Request, res: Response) => {
  const user = req.query.user as string;
  const service = req.query.service as string;
  try {
    const events = await getCloudTrailEvents(user, service);
    res.json(events);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/aws/security - Security Findings & Audit
awsRouter.get('/aws/security', async (req: Request, res: Response) => {
  try {
    const audit = await runAwsSecurityAudit();
    res.json(audit);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/aws/ec2/start/:id - Start EC2 Instance
awsRouter.post('/aws/ec2/start/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const result = await executeEc2Action(id, 'start', req.user.email);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/aws/ec2/stop/:id - Stop EC2 Instance
awsRouter.post('/aws/ec2/stop/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const result = await executeEc2Action(id, 'stop', req.user.email);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/aws/ec2/reboot/:id - Reboot EC2 Instance
awsRouter.post('/aws/ec2/reboot/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const result = await executeEc2Action(id, 'reboot', req.user.email);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
