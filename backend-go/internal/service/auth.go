package service

import (
	"context"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"github.com/ssco/backend/internal/model"
	"golang.org/x/crypto/bcrypt"
)

const saltRounds = 10

type AuthService struct {
	db               *pgxpool.Pool
	rdb              *redis.Client
	jwtSecret        []byte
	jwtRefreshSecret []byte
	accessExpiry     time.Duration
	refreshExpiry    time.Duration
}

func NewAuthService(db *pgxpool.Pool, rdb *redis.Client, jwtSecret, jwtRefreshSecret, accessExpiry, refreshExpiry string) (*AuthService, error) {
	aExp, err := time.ParseDuration(accessExpiry)
	if err != nil {
		aExp = 24 * time.Hour
	}
	rExp, err := time.ParseDuration(refreshExpiry)
	if err != nil {
		rExp = 168 * time.Hour
	}
	return &AuthService{
		db:               db,
		rdb:              rdb,
		jwtSecret:        []byte(jwtSecret),
		jwtRefreshSecret: []byte(jwtRefreshSecret),
		accessExpiry:     aExp,
		refreshExpiry:    rExp,
	}, nil
}

type LoginResult struct {
	User         model.User       `json:"user"`
	AccessToken  string           `json:"accessToken"`
	RefreshToken string           `json:"refreshToken"`
	ExpiresIn    int              `json:"expiresIn"`
}

func (s *AuthService) Login(ctx context.Context, email, password string) (*LoginResult, error) {
	row := s.db.QueryRow(ctx,
		`SELECT id, email, password_hash, role, is_active FROM users WHERE email = $1`, email)

	var u model.User
	if err := row.Scan(&u.ID, &u.Email, &u.PasswordHash, &u.Role, &u.IsActive); err != nil {
		return nil, fmt.Errorf("invalid email or password")
	}
	if !u.IsActive {
		return nil, fmt.Errorf("user account is inactive")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(password)); err != nil {
		return nil, fmt.Errorf("invalid email or password")
	}

	_, _ = s.db.Exec(ctx, `UPDATE users SET last_login = NOW() WHERE id = $1`, u.ID)

	tokens, err := s.generateTokens(ctx, u)
	if err != nil {
		return nil, err
	}
	return tokens, nil
}

func (s *AuthService) Logout(ctx context.Context, refreshToken string) {
	claims := &jwtClaims{}
	_, err := jwt.ParseWithClaims(refreshToken, claims, func(t *jwt.Token) (any, error) {
		return s.jwtRefreshSecret, nil
	})
	if err != nil {
		return
	}
	key := fmt.Sprintf("refresh_token:%s:%s", claims.UserID, refreshToken)
	_ = s.rdb.Del(ctx, key).Err()
}

func (s *AuthService) Refresh(ctx context.Context, refreshToken string) (*LoginResult, error) {
	claims := &jwtClaims{}
	_, err := jwt.ParseWithClaims(refreshToken, claims, func(t *jwt.Token) (any, error) {
		return s.jwtRefreshSecret, nil
	})
	if err != nil {
		return nil, fmt.Errorf("invalid refresh token")
	}

	key := fmt.Sprintf("refresh_token:%s:%s", claims.UserID, refreshToken)
	exists, _ := s.rdb.Exists(ctx, key).Result()
	if exists == 0 {
		return nil, fmt.Errorf("refresh token has been revoked")
	}

	row := s.db.QueryRow(ctx,
		`SELECT id, email, password_hash, role, is_active FROM users WHERE id = $1 AND is_active = true`,
		claims.UserID)
	var u model.User
	if err := row.Scan(&u.ID, &u.Email, &u.PasswordHash, &u.Role, &u.IsActive); err != nil {
		return nil, fmt.Errorf("user not found or inactive")
	}

	_ = s.rdb.Del(ctx, key).Err()
	return s.generateTokens(ctx, u)
}

func (s *AuthService) GetUserByID(ctx context.Context, userID string) (*model.User, error) {
	row := s.db.QueryRow(ctx,
		`SELECT id, email, role, is_active, created_at, updated_at FROM users WHERE id = $1`, userID)
	var u model.User
	if err := row.Scan(&u.ID, &u.Email, &u.Role, &u.IsActive, &u.CreatedAt, &u.UpdatedAt); err != nil {
		return nil, fmt.Errorf("user not found")
	}
	return &u, nil
}

func (s *AuthService) ChangePassword(ctx context.Context, userID, oldPassword, newPassword string) error {
	row := s.db.QueryRow(ctx, `SELECT password_hash FROM users WHERE id = $1`, userID)
	var hash string
	if err := row.Scan(&hash); err != nil {
		return fmt.Errorf("user not found")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(oldPassword)); err != nil {
		return fmt.Errorf("current password is incorrect")
	}
	newHash, err := bcrypt.GenerateFromPassword([]byte(newPassword), saltRounds)
	if err != nil {
		return err
	}
	_, err = s.db.Exec(ctx, `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`, string(newHash), userID)
	return err
}

func (s *AuthService) HashPassword(password string) (string, error) {
	h, err := bcrypt.GenerateFromPassword([]byte(password), saltRounds)
	return string(h), err
}

// ── Internal ──────────────────────────────────────────────────────────────────

type jwtClaims struct {
	UserID string `json:"userId"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

func (s *AuthService) generateTokens(ctx context.Context, u model.User) (*LoginResult, error) {
	now := time.Now()

	accessClaims := &jwtClaims{
		UserID: u.ID,
		Email:  u.Email,
		Role:   u.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(s.accessExpiry)),
			IssuedAt:  jwt.NewNumericDate(now),
		},
	}
	accessToken, err := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims).SignedString(s.jwtSecret)
	if err != nil {
		return nil, err
	}

	refreshClaims := &jwtClaims{
		UserID: u.ID,
		Email:  u.Email,
		Role:   u.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(s.refreshExpiry)),
			IssuedAt:  jwt.NewNumericDate(now),
		},
	}
	refreshToken, err := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims).SignedString(s.jwtRefreshSecret)
	if err != nil {
		return nil, err
	}

	key := fmt.Sprintf("refresh_token:%s:%s", u.ID, refreshToken)
	_ = s.rdb.SetEx(ctx, key, "1", s.refreshExpiry).Err()

	return &LoginResult{
		User:         u,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    int(s.accessExpiry.Seconds()),
	}, nil
}
