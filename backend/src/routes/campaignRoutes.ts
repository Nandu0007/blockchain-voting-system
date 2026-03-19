import { Router } from 'express';
import Joi from 'joi';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { auditService } from '../services/auditService';
import { campaignService } from '../services/campaignService';
import { voterService } from '../services/voterService';
import type { BallotType, CampaignStatus } from '../types/models';
import { ok } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

const createCampaignSchema = Joi.object({
  title: Joi.string().min(3).max(140).required(),
  description: Joi.string().min(10).max(5000).required(),
  startTime: Joi.string().isoDate().required(),
  endTime: Joi.string().isoDate().required(),
  ballotType: Joi.string().valid('SINGLE_CHOICE', 'MULTI_CHOICE', 'RANKING').required(),
  encryptedVotes: Joi.boolean().required(),
  options: Joi.array().items(Joi.string().min(1).max(200)).min(2).required(),
  chainId: Joi.number().integer().positive().required(),
  contractAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).optional(),
});

const updateStatusSchema = Joi.object({
  status: Joi.string().valid('PENDING', 'ACTIVE', 'PAUSED', 'ENDED', 'CANCELLED').required(),
});

const castVoteSchema = Joi.object({
  selectedOptionIds: Joi.array().items(Joi.number().integer().min(0)).min(1).required(),
  encryptedPayload: Joi.string().optional(),
});

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const status = req.query.status as CampaignStatus | undefined;
    const campaigns = campaignService.list(status);
    res.json(ok({ campaigns }, req.requestId));
  }),
);

router.get(
  '/:campaignId',
  asyncHandler(async (req, res) => {
    const campaign = campaignService.getOne(req.params.campaignId);
    res.json(ok({ campaign }, req.requestId));
  }),
);

router.post(
  '/',
  authenticate,
  requireRole('admin'),
  validate({ body: createCampaignSchema }),
  asyncHandler(async (req, res) => {
    const campaign = campaignService.create(
      {
        ...req.body,
        ballotType: req.body.ballotType as BallotType,
      },
      req.auth!.wallet,
    );

    auditService.log('CAMPAIGN_CREATED', req.auth!.wallet, 'CAMPAIGN', campaign.id, {
      chainId: campaign.chainId,
      encryptedVotes: campaign.encryptedVotes,
    });

    res.status(201).json(ok({ campaign }, req.requestId));
  }),
);

router.patch(
  '/:campaignId/status',
  authenticate,
  requireRole('admin'),
  validate({ body: updateStatusSchema }),
  asyncHandler(async (req, res) => {
    const campaign = campaignService.updateStatus(req.params.campaignId, req.body.status as CampaignStatus);

    auditService.log('CAMPAIGN_STATUS_UPDATED', req.auth!.wallet, 'CAMPAIGN', campaign.id, {
      status: campaign.status,
    });

    res.json(ok({ campaign }, req.requestId));
  }),
);

router.post(
  '/:campaignId/votes',
  authenticate,
  requireRole('voter', 'admin'),
  validate({ body: castVoteSchema }),
  asyncHandler(async (req, res) => {
    const voter = voterService.getOne(req.auth!.wallet);
    if (!voter.verified || voter.suspended) {
      res.status(403).json(
        ok(
          {
            accepted: false,
            reason: 'Voter is not eligible for voting',
          },
          req.requestId,
        ),
      );
      return;
    }

    const vote = campaignService.castVote(req.params.campaignId, req.auth!.wallet, req.body);
    auditService.log('VOTE_CAST', req.auth!.wallet, 'VOTE', vote.id, {
      campaignId: vote.campaignId,
      receiptHash: vote.receiptHash,
    });

    res.status(201).json(ok({ vote }, req.requestId));
  }),
);

router.get(
  '/:campaignId/results',
  asyncHandler(async (req, res) => {
    const results = campaignService.getResults(req.params.campaignId);
    res.json(ok({ results }, req.requestId));
  }),
);

router.get(
  '/:campaignId/audit',
  authenticate,
  requireRole('admin', 'auditor'),
  asyncHandler(async (req, res) => {
    const events = auditService.listByTarget('CAMPAIGN', req.params.campaignId);
    res.json(ok({ events }, req.requestId));
  }),
);

export default router;
