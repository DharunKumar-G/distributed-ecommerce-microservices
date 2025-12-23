# Contributing to Distributed E-Commerce Microservices

First off, thanks for taking the time to contribute! 🎉

## 🚀 Quick Start for Contributors

```bash
# Fork and clone
git clone https://github.com/YOUR_USERNAME/distributed-ecommerce-microservices.git
cd distributed-ecommerce-microservices

# Start the stack
docker-compose up -d

# Run the UI
cd ui && npm install && npm run dev
```

## 📁 Project Structure

```
├── services/
│   ├── order-service/      # Go - Saga orchestrator
│   ├── inventory-service/  # Go - Stock management
│   ├── catalog-service/    # Node.js - Product CRUD + Search
│   ├── payment-service/    # Rust - Payment processing
│   ├── notification-service/ # Python - Notifications
│   ├── user-service/       # Node.js - Authentication
│   └── web3-service/       # Node.js - Crypto payments
├── ui/                     # React frontend
├── monitoring/             # Prometheus + Grafana configs
├── kong/                   # API Gateway config
└── init-db/               # Database migrations
```

## 🔧 Development Guidelines

### Adding a New Feature

1. Create a feature branch: `git checkout -b feature/awesome-feature`
2. Make your changes
3. Test locally with `docker-compose up -d`
4. Commit with conventional commits: `feat: add awesome feature`
5. Push and create a PR

### Commit Message Format

We use [Conventional Commits](https://conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `style:` - Code style (formatting, etc)
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

### Service-Specific Guidelines

#### Go Services (Order, Inventory)
- Follow [Effective Go](https://golang.org/doc/effective_go.html)
- Run `go fmt` before committing
- Add tests in `*_test.go` files

#### Rust Service (Payment)
- Run `cargo fmt` and `cargo clippy`
- Follow Rust naming conventions

#### Node.js Services (Catalog, User, Web3)
- Use TypeScript strict mode
- Run `npm run lint` before committing

#### Python Service (Notification)
- Follow PEP 8
- Use type hints where possible

## 🧪 Testing

```bash
# Run all service health checks
./scripts/health-check.sh

# Load testing
./load-test.sh

# Test specific service
cd services/order-service && go test ./...
```

## 📝 Pull Request Process

1. Update documentation if needed
2. Add/update tests for new features
3. Ensure all services start correctly
4. Update CHANGELOG if applicable
5. Request review from maintainers

## 🐛 Bug Reports

Please include:
- Service affected
- Steps to reproduce
- Expected vs actual behavior
- Docker/system info
- Relevant logs

## 💡 Feature Requests

We love new ideas! Please describe:
- The problem you're solving
- Proposed solution
- Alternatives considered
- Impact on existing architecture

## 📜 Code of Conduct

Be respectful and inclusive. We're all here to learn and build cool stuff together!

## 🏆 Recognition

Contributors will be added to our README. Thank you for making this project better!

---

Questions? Open an issue or reach out!
