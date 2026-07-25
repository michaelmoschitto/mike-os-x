FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV LANG=en_US.UTF-8
ENV LC_ALL=en_US.UTF-8

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
    unzip \
    locales \
    fonts-powerline \
    && rm -rf /var/lib/apt/lists/*

RUN locale-gen en_US.UTF-8

RUN useradd -m -d /workspace -s /bin/zsh -u 1000 workspace && \
    rm -rf /home/workspace || true

WORKDIR /workspace

USER root

RUN git clone --depth 1 https://github.com/ohmyzsh/ohmyzsh.git /opt/oh-my-zsh && \
    git clone --depth 1 https://github.com/zsh-users/zsh-autosuggestions /opt/oh-my-zsh/custom/plugins/zsh-autosuggestions && \
    git clone --depth 1 https://github.com/zsh-users/zsh-syntax-highlighting.git /opt/oh-my-zsh/custom/plugins/zsh-syntax-highlighting && \
    git clone --depth 1 https://github.com/junegunn/fzf.git /opt/fzf && \
    cd /opt/fzf && \
    ./install --all --no-bash --no-fish && \
    chown -R workspace:workspace /opt/oh-my-zsh /opt/fzf

RUN mkdir -p /opt/zsh && \
    echo 'export ZSH="/opt/oh-my-zsh"' > /opt/zsh/.zshrc && \
    echo 'export FZF_BASE="/opt/fzf"' >> /opt/zsh/.zshrc && \
    echo 'ZSH_THEME="random"' >> /opt/zsh/.zshrc && \
    echo 'plugins=(git fzf zsh-autosuggestions zsh-syntax-highlighting)' >> /opt/zsh/.zshrc && \
    echo 'source $ZSH/oh-my-zsh.sh' >> /opt/zsh/.zshrc && \
    echo 'source /opt/fzf/shell/key-bindings.zsh' >> /opt/zsh/.zshrc && \
    echo 'source /opt/fzf/shell/completion.zsh' >> /opt/zsh/.zshrc && \
    chown -R workspace:workspace /opt/zsh

USER workspace

CMD ["tail", "-f", "/dev/null"]

