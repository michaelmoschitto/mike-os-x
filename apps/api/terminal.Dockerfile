FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    bash \
    zsh \
    git \
    vim \
    nano \
    curl \
    wget \
    htop \
    tree \
    jq \
    python3 \
    python3-pip \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -m -s /bin/bash -u 1000 workspace

RUN mkdir -p /workspace && chown workspace:workspace /workspace
WORKDIR /workspace

RUN echo 'export PS1="\[\033[01;32m\]\u@terminal\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\]\$ "' >> /home/workspace/.bashrc

USER workspace

CMD ["tail", "-f", "/dev/null"]

