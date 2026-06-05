// Package queue replaces Bull + Redis job queue with a simple in-process cron.
// For this app's workload (one full collection every 6 hours), robfig/cron
// is sufficient and removes the Redis-as-queue dependency entirely.
package queue

import (
	"context"
	"log/slog"
	"strings"

	"github.com/robfig/cron/v3"
	"github.com/ssco/backend/internal/service"
)

type Scheduler struct {
	c          *cron.Cron
	collection *service.DataCollectionService
	keywords   []string
}

func NewScheduler(collection *service.DataCollectionService, cronExpr, defaultKeywords string) *Scheduler {
	c := cron.New()
	keywords := strings.Split(defaultKeywords, ",")
	for i := range keywords {
		keywords[i] = strings.TrimSpace(keywords[i])
	}
	return &Scheduler{c: c, collection: collection, keywords: keywords}
}

func (s *Scheduler) Start(cronExpr string) error {
	_, err := s.c.AddFunc(cronExpr, func() {
		slog.Info("cron: starting full collection", "keywords", s.keywords)
		ctx := context.Background()
		collected, stored, errs := s.collection.CollectFromAPIs(ctx, s.keywords)
		slog.Info("cron: collection done", "collected", collected, "stored", stored, "errors", len(errs))
		if len(errs) > 0 {
			slog.Warn("cron: collection errors", "errs", errs)
		}
	})
	if err != nil {
		return err
	}
	s.c.Start()
	slog.Info("cron scheduler started", "expr", cronExpr)
	return nil
}

func (s *Scheduler) Stop() {
	ctx := s.c.Stop()
	<-ctx.Done()
	slog.Info("cron scheduler stopped")
}
