// Package migrations provides a goose-based migration runner.
// It reuses the existing SQL migration files from the Node.js backend.
package migrations

import (
	"database/sql"
	"embed"
	"fmt"

	"github.com/pressly/goose/v3"
)

//go:embed *.sql
var sqlFiles embed.FS

// Up runs all pending migrations.
func Up(db *sql.DB) error {
	goose.SetBaseFS(sqlFiles)
	if err := goose.SetDialect("postgres"); err != nil {
		return fmt.Errorf("set dialect: %w", err)
	}
	return goose.Up(db, ".")
}

// Down rolls back the last migration.
func Down(db *sql.DB) error {
	goose.SetBaseFS(sqlFiles)
	if err := goose.SetDialect("postgres"); err != nil {
		return fmt.Errorf("set dialect: %w", err)
	}
	return goose.Down(db, ".")
}
